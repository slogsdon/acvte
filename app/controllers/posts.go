package controllers

import (
	"github.com/robfig/revel"
	"github.com/slogsdon/acvte/app/models"
	"github.com/slogsdon/acvte/modules/db"
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
	if err != nil {
		c.Response.Status = 404
		return c.Render()
	}

	// less magic in rendering for more magic in routing
	c.RenderArgs["posts"] = posts
	return c.RenderTemplate("Posts/Category.html")
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
