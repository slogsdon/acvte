package models

import (
	"github.com/robfig/revel"
	"time"
)

const (
	// Time layout used to process DB datetime values.
	DbtimeLayout = "2006-01-02 15:04:05"
)

// Table name: posts
type Post struct {
	Id          int32     `json:"id" qbs:"pk,notnull"`
	Title       string    `json:"title"`
	Slug        string    `json:"slug"`
	Content     string    `json:"content"`
	Draft       bool      `json:"draft" qbs:"default:'true'"`
	CreatedAt   time.Time `json:"created_at" qbs:"notnull,created"`
	UpdatedAt   time.Time `json:"updated_at" qbs:"notnull,updated"`
	Aside       bool      `json:"aside"`
	Url         string    `json:"url"`
	Parent      int32     `json:"parent"`
	Timespent   int32     `json:"timespent"`
	PublishedAt time.Time `json:"published_at"`
	Page 		bool	  `json:"page"`
	External    bool      `qbs:"-"`
	NextPost    *Post     `qbs:"-"`
	PrevPost    *Post     `qbs:"-"`
}

func (p *Post) Date() string {
	return p.PublishedAt.Format("January 2, 2006")
}

func (p *Post) CreatedAtDateTime() string {
	return p.CreatedAt.Format(DbtimeLayout)
}

func (p *Post) PublishedAtDateTime() string {
	return p.PublishedAt.Format(DbtimeLayout)
}

func (p *Post) UpdatedAtDateTime() string {
	return p.UpdatedAt.Format(DbtimeLayout)
}

func (p *Post) Equals(post *Post) bool {
	result := true
	if p.Id != post.Id {
		result = false
	}
	if p.Title != post.Title {
		result = false
	}
	if p.Slug != post.Slug {
		result = false
	}
	if p.Content != post.Content {
		result = false
	}
	if p.Draft != post.Draft {
		result = false
	}
	if p.CreatedAt != post.CreatedAt {
		result = false
	}
	if p.UpdatedAt != post.UpdatedAt {
		result = false
	}
	if p.Aside != post.Aside {
		result = false
	}
	if p.Url != post.Url {
		result = false
	}
	if p.Parent != post.Parent {
		result = false
	}
	if p.Timespent != post.Timespent {
		result = false
	}
	if p.PublishedAt != post.PublishedAt {
		result = false
	}
	if p.Page != post.Page {
		result = false
	}
	return result
}

func (p *Post) Validate(v *revel.Validation) {
	v.Required(p.Title)
}