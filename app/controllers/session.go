package controllers

import (
    "github.com/robfig/revel"
    // "github.com/slogsdon/acvte/app/models"
    // "github.com/slogsdon/acvte/app/modules/db"
    // "code.google.com/p/go.crypto/bcrypt"
)

type Session struct {
    *revel.Controller
}

func (c Session) init() {
}

func (c Session) Index() revel.Result {
    return c.Render()
}