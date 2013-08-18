package controllers

import (
    "github.com/robfig/revel"
    "github.com/slogsdon/acvte/app/models"
    "github.com/slogsdon/acvte/app/modules/db"
)

type Posts struct {
    *revel.Controller
}

func (c Posts) init() {
}

func (c Posts) Index() revel.Result {
    var posts []*models.Post
    db.Db.OrderByDesc("published_at").FindAll(&posts)
    return c.Render(posts)
}

func (c Posts) Show(slug string) revel.Result {
    post := new(models.Post)
    db.Db.WhereEqual("slug", slug).Limit(1).Find(post)

    post.NextPost = c.NextPost(post)
    post.PrevPost = c.PrevPost(post)

    return c.Render(post)
}

func (c Posts) NextPost(p *models.Post) (*models.Post) {
    var id int32
    err := db.Db.QueryRow("SELECT min(id) FROM post WHERE id > ? LIMIT 1", p.Id).Scan(&id)

    if err != nil {
        return nil
    }

    post := new(models.Post)
    db.Db.WhereEqual("id", id).Find(post)
    return post
}

func (c Posts) PrevPost(p *models.Post) (*models.Post) {
    var id int32
    err := db.Db.QueryRow("SELECT max(id) as id FROM post WHERE id < ? LIMIT 1", p.Id).Scan(&id)

    if err != nil {
        return nil
    }

    post := new(models.Post)
    db.Db.WhereEqual("id", id).Find(post)
    return post
}