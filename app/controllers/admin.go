package controllers

import (
    "github.com/robfig/revel"
    "github.com/slogsdon/acvte/app/models"
    "github.com/slogsdon/acvte/app/modules/db"
)

type Admin struct {
    *revel.Controller
}

func (c Admin) init() {
}

func (c Admin) Index() revel.Result {
    var (
        drafts    []*models.Post
        published []*models.Post
    )
    db.Db.Where("draft = 1").FindAll(&drafts)
    db.Db.Where("draft = 0").OrderByDesc("published_at").FindAll(&published)
    return c.Render(drafts, published)
}

func (c Admin) New() revel.Result {
    return c.Render()
}

func (c Admin) Edit(id int32) revel.Result {
    var post *models.Post

    db.Db.WhereEqual("id", id).Find(&post)
    return c.Render(post)
}

func (c Admin) Update(p *models.Post) revel.Result {
    p.Validate(c.Validation)

    // Handle errors
    if c.Validation.HasErrors() {
        c.Validation.Keep()
        c.FlashParams()
    }

    return c.RenderJson(p)
}