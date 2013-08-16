package models

import (
    "github.com/eaigner/jet"
    _ "github.com/go-sql-driver/mysql"
	"time"
)
 
const (
	// Time layout used to process DB datetime values.
	DbtimeLayout = "2006-01-02 15:04:05"
)

var (
	db  jet.Db
	err error
)

type Post struct {
	Id           int
	Title        string
	Slug         string
	Content      string
	Draft        bool
	CreatedAt    string
	UpdatedAt    string
	Aside        bool
	Url          string
	Parent       int
	Timespent    int
	PublishedAt  string
	External     bool
}

func init() {
    db, err = jet.Open("mysql", "root:$emeleted46@/blog")

    if (err != nil) {
        panic(err)
    }
}

func (p *Post) PublishedAtTime() (time.Time, error) {
	ts, err := time.Parse(DbtimeLayout, p.PublishedAt)
	if err != nil {
		return time.Time{}, err
	}
	return ts, err
}

func (p *Post) Date() (string) {
	ts, _ := p.PublishedAtTime()
	return ts.Format("January 2, 2006")
}

func (p *Post) NextPost() (*Post) {
    var post *Post
    db.Query(`SELECT * FROM posts WHERE id = (SELECT min(id) FROM posts WHERE id > ?) LIMIT 1`, p.Id).Rows(&post)
    return post
}

func (p *Post) PrevPost() (*Post) {
    var post *Post
    db.Query(`SELECT * FROM posts WHERE id = (SELECT max(id) FROM posts WHERE id < ?) LIMIT 1`, p.Id).Rows(&post)
    return post
}