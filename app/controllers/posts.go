package controllers

import (
	"encoding/xml"
	"github.com/robfig/revel"
	"github.com/russross/blackfriday"
	"github.com/slogsdon/acvte/app/models"
	"github.com/slogsdon/acvte/modules/db"
	"strings"
)

type Posts struct {
	*revel.Controller
}

func (c Posts) Index() revel.Result {
	var posts []*models.Post
	db.Db.OrderByDesc("published_at").FindAll(&posts)
	return c.Render(posts)
}

func (c Posts) Category(slug string) revel.Result {
	var posts []*models.Post
	err := db.Db.Where("slug LIKE '"+slug+"/%'").OrderByDesc("published_at").FindAll(&posts)

	// Post not found. issue 404
	if err != nil || len(posts) == 0 {
		c.Response.Status = 404
		return c.Render()
	}

	// title case the category slug
	category := strings.Replace(slug, "-", " ", -1)
	category = strings.Title(category)

	// less magic in rendering for more magic in routing
	c.RenderArgs["category"] = category
	c.RenderArgs["posts"] = posts
	return c.RenderTemplate("Posts/Category.html")
}

func (c Posts) Feed() revel.Result {
	var posts []*models.Post
	db.Db.OrderByDesc("published_at").Limit(10).FindAll(&posts)

	rss := new(Rss)
	rss.Version = "2.0"

	rss.Channel = new(Channel)
	rss.Channel.Title = "test title"
	rss.Channel.Link = "/"

	//rss.Channel.Item = new([]*Item)

	count := len(posts)
	for i := 0; i < count; i++ {
		rss.Channel.Item = append(rss.Channel.Item, &Item{
			Title:       posts[i].Title,
			Description: markdown(posts[i].Content),
			PubDate:     posts[i].PublishedAtDateTime(),
			Link:        "http://"+c.Request.Host+"/"+posts[i].Slug,
			Guid:        "http://"+c.Request.Host+"/"+posts[i].Slug,
		})
	}

	c.Response.Out.Write([]byte(xml.Header))
	return c.RenderXml(rss)
}

func (c Posts) Show(slug string) revel.Result {
	post := new(models.Post)
	db.Db.WhereEqual("slug", slug).Limit(1).Find(post)

	// Post not found. Try displaying category
	if post.Id == 0 {
		return c.Category(slug)
	}

	post.NextPost = c.NextPost(post)
	post.PrevPost = c.PrevPost(post)

	return c.Render(post)
}

func (c Posts) ShowInCategory(category string, slug string) revel.Result {
	post := new(models.Post)
	db.Db.WhereEqual("slug", category+"/"+slug).Limit(1).Find(post)

	// Post not found. issue 404
	if post.Id == 0 {
		c.Response.Status = 404
		return c.Render()
	}

	post.NextPost = c.NextPost(post)
	post.PrevPost = c.PrevPost(post)

	return c.Render(post)
}

func (c Posts) NextPost(p *models.Post) *models.Post {
	var id int32
	err := db.Db.QueryRow("SELECT min(id) FROM post WHERE id > ? LIMIT 1", p.Id).Scan(&id)

	// we only care if we can find a next post
	if err != nil {
		return nil
	}

	post := new(models.Post)
	db.Db.WhereEqual("id", id).Find(post)
	return post
}

func (c Posts) PrevPost(p *models.Post) *models.Post {
	var id int32
	err := db.Db.QueryRow("SELECT max(id) as id FROM post WHERE id < ? LIMIT 1", p.Id).Scan(&id)

	// we only care if we can find a previous post
	if err != nil {
		return nil
	}

	post := new(models.Post)
	db.Db.WhereEqual("id", id).Find(post)
	return post
}

 func markdown(str string) string {
		// this did use blackfriday.MarkdownCommon, but it was stripping out <script>
		input := []byte(str)

		htmlFlags := 0
		htmlFlags |= blackfriday.HTML_USE_XHTML
		htmlFlags |= blackfriday.HTML_USE_SMARTYPANTS
		htmlFlags |= blackfriday.HTML_SMARTYPANTS_FRACTIONS
		htmlFlags |= blackfriday.HTML_SMARTYPANTS_LATEX_DASHES
		renderer := blackfriday.HtmlRenderer(htmlFlags, "", "")

		// set up the parser
		extensions := 0
		extensions |= blackfriday.EXTENSION_NO_INTRA_EMPHASIS
		extensions |= blackfriday.EXTENSION_TABLES
		extensions |= blackfriday.EXTENSION_FENCED_CODE
		extensions |= blackfriday.EXTENSION_AUTOLINK
		extensions |= blackfriday.EXTENSION_STRIKETHROUGH
		extensions |= blackfriday.EXTENSION_SPACE_HEADERS

		output := blackfriday.Markdown(input, renderer, extensions)
		return string(output)
	}

type Rss struct {
	XMLName  xml.Name `xml:"rss"`
	Version  string   `xml:"version,attr"`
	*Channel  
}

type Channel struct {
	XMLName     xml.Name `xml:"channel"`
	Title       string   `xml:"title"`
	Description string   `xml:"description"`
	Link        string   `xml:"link"`
	Item        []*Item
}

type Item struct {
	XMLName     xml.Name `xml:"item"`
	Title       string   `xml:"title"`
	Description string   `xml:"description"`
	PubDate     string   `xml:"pubDate"`
	Link        string   `xml:"link"`
	Guid        string   `xml:"guid"`
}
