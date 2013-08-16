package controllers

import (
    "github.com/eaigner/jet"
    _ "github.com/go-sql-driver/mysql"
    "github.com/robfig/revel"
    "github.com/russross/blackfriday"
    "github.com/slogsdon/goblog/app/models"
)

type Posts struct {
    *revel.Controller
}

var (
    db  jet.Db
    err error
)

func init() {
    revel.TemplateFuncs["markdown"] = func (str string) string {
        output := blackfriday.MarkdownCommon([]byte(str))
        return string(output)
    }

    db, err = jet.Open("mysql", "root:$emeleted46@/blog")

    if (err != nil) {
        panic(err)
    }
}

func (c Posts) Index() revel.Result {
    var posts []*models.Post
    db.Query(`SELECT * FROM posts ORDER BY published_at DESC`).Rows(&posts)
    return c.Render(posts)
}

func (c Posts) Show(slug string) revel.Result {
    var post *models.Post
    db.Query(`SELECT * FROM posts WHERE slug = ? LIMIT 1`, slug).Rows(&post)
    return c.Render(post)
}