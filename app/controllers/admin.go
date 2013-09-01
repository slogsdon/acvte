package controllers

import (
	"encoding/json"
	"github.com/robfig/revel"
	"github.com/slogsdon/acvte/app/models"
	"github.com/slogsdon/acvte/modules/auth"
	"github.com/slogsdon/acvte/modules/db"
	"regexp"
	"strings"
	"time"
)

var invalidSlugPattern = regexp.MustCompile(`[^a-z0-9 \/_-]`)
var whiteSpacePattern = regexp.MustCompile(`\s+`)

type Admin struct {
	*revel.Controller
}

func (c Admin) Index() revel.Result {
	auth.CheckSession(c.Controller)

	var (
		drafts    []*models.Post
		published []*models.Post
	)
	db.Db.Where("draft = 1").OrderBy("created_at").FindAll(&drafts)
	db.Db.Where("draft = 0").OrderByDesc("published_at").FindAll(&published)
	return c.Render(drafts, published)
}

func (c Admin) New() revel.Result {
	auth.CheckSession(c.Controller)

	return c.Render()
}

func (c Admin) Edit(id int32) revel.Result {
	auth.CheckSession(c.Controller)

	post := new(models.Post)
	db.Db.WhereEqual("id", id).Find(post)
	return c.Render(post)
}

func (c Admin) Update(post *models.Post) revel.Result {
	auth.CheckSession(c.Controller)

	post.Validate(c.Validation)
	// Handle errors
	if c.Validation.HasErrors() {
		c.Validation.Keep()
		c.FlashParams()
	}

	p := new(models.Post)
	db.Db.WhereEqual("id", post.Id).Find(p)

	if !p.Equals(post) {
		db.Db.Save(post)
	}

	return c.RenderJson(post)
}

func (c Admin) DraftIn(secret string, payload string) revel.Result {
	allowDraftIn := revel.Config.BoolDefault("acvte.allow_draftin_publishing", false)
	if !allowDraftIn { return c.RenderJson(false) }

	appSecret := revel.Config.StringDefault("app.secret","")
	if appSecret != secret { return c.RenderJson(false) }

	var p DraftInPayload
	err := json.Unmarshal([]byte(payload), &p)
	if err != nil { return c.RenderJson(false) }

	user := new(models.User)
	db.Db.WhereEqual("email", p.User.Email).Find(user)
	if user.Id == 0 { return c.RenderJson(false) }
	
	post := new(models.Post)
	db.Db.WhereEqual("id", p.Id).Find(post)

	name := p.Name
	if i := strings.Index(name, "/"); i != -1 {
		name = strings.Trim(name[i+1:], " ")
		charBefore := p.Name[i-1:i]
		charAfter := p.Name[i+1:i+2]
		removedBefore := false
		if charBefore == " " {
			p.Name = p.Name[:i-1]+p.Name[i:]
		}
		if charAfter == " " {
			if removedBefore { i -= 1 }
			p.Name = p.Name[:i]+p.Name[i+1:]
		}
	}

	if post.Id == 0 {
		post.Id = p.Id
	}
	post.Title = name
	post.Content = p.Content
	post.CreatedAt = p.CreatedAt
	post.UpdatedAt = p.UpdatedAt
	post.PublishedAt = time.Now()
	post.Slug = slugify(strings.Trim(p.Name, " "))
	post.Draft = false
	post.Page = false

	_, e := db.Db.Save(post)
	if e != nil { return c.RenderJson(false) }

	return c.RenderJson(true)
}

func slugify(text string) string {
	separator := "-"
	text = strings.ToLower(text)
	text = invalidSlugPattern.ReplaceAllString(text, "")
	text = whiteSpacePattern.ReplaceAllString(text, separator)
	text = strings.Trim(text, separator)
	return text
}

type DraftInPayload struct {
	Id             int32       `json:"id"`
    Name           string      `json:"name"`
    Content        string      `json:"content"`
    ContentHtml    string      `json:"content_html"`
    ContentHtmlRaw string      `json:"content_html_raw"`
    Token          string      `json:"token"`
    User           DraftInUser `json:"user"`
    CreatedAt      time.Time   `json:"created_at"`
    UpdatedAt      time.Time   `json:"updatedAt"`
}

type DraftInUser struct {
    Id    int32  `json:"id"`
    Email string `json:"email"`
}
