package controllers

import (
    "github.com/robfig/revel"
    "github.com/eaigner/jet"
    _ "github.com/go-sql-driver/mysql"
    "github.com/slogsdon/goblog/app/models"
)

type Posts struct {
    *revel.Controller
}

func (c Posts) Index() revel.Result {
    db, err := jet.Open("mysql", "root:$emeleted46@/blog")

    if (err != nil) {
        panic(err)
    }

    // clear posts slice
    var posts []*models.Post
    db.Query(`SELECT * FROM posts ORDER BY published_at DESC`).Rows(&posts)
    return c.Render(posts)
}

func (c Posts) Show(slug string) revel.Result {
    db, err := jet.Open("mysql", "root:$emeleted46@/blog")

    if (err != nil) {
        panic(err)
    }
    var post *models.Post
    db.Query(`SELECT * FROM posts WHERE slug = ? LIMIT 1`, slug).Rows(&post)
    return c.Render(post)
}