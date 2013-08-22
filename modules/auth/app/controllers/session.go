package controllers

import (
	"github.com/robfig/revel"
	m "github.com/slogsdon/acvte/app/models"
	"github.com/slogsdon/acvte/modules/auth"
	"github.com/slogsdon/acvte/modules/db"
)

type Session struct {
	*revel.Controller
}

func (c Session) init() {}

func (c Session) Index() revel.Result {
	return c.Redirect("/session/create")
}

func (c Session) Create(username string, password string) revel.Result {
	if c.Request.Method == "POST" {
		user := new(m.User)
		db.Db.WhereEqual("username", username).Limit(1).Find(user)

		if err := auth.RegisterSession(c.Controller, user.CryptedPassword, password); err != nil {
			return c.RenderJson(user)
		} else {
			return c.Redirect("/admin")
		}
	}
	return c.Render()
}

func (c Session) Destroy() revel.Result {
	return c.Render()
}
