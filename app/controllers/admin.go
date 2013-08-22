package controllers

import (
	"github.com/robfig/revel"
	"github.com/slogsdon/acvte/app/models"
	"github.com/slogsdon/acvte/modules/auth"
	"github.com/slogsdon/acvte/modules/db"
)

type Admin struct {
	*revel.Controller
}

func (c Admin) Index() revel.Result {
	auth.CheckSession(c.Controller)

	var (
		drafts    []*models.Post
		published []*models.Post
	)
	db.Db.Where("draft = 1").FindAll(&drafts)
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

func (c Admin) Update(p *models.Post) revel.Result {
	auth.CheckSession(c.Controller)

	p.Validate(c.Validation)
	// Handle errors
	if c.Validation.HasErrors() {
		c.Validation.Keep()
		c.FlashParams()
	}

	return c.RenderJson(p)
}
