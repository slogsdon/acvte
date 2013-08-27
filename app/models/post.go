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
	External    bool      `qbs:"-"`
	NextPost    *Post     `qbs:"-"`
	PrevPost    *Post     `qbs:"-"`
}

func (p *Post) Validate(v *revel.Validation) {
	v.Required(p.Title)
}

func (p *Post) Date() string {
	return p.PublishedAt.Format("January 2, 2006")
}

func (p *Post) CreatedAtDateTime() string {
	return p.CreatedAt.Format("2006-01-02 15:04")
}

func (p *Post) PublishedAtDateTime() string {
	return p.PublishedAt.Format("2006-01-02 15:04")
}
