package controllers

import "github.com/robfig/revel"

type Admin struct {
    *revel.Controller
}

func (c Admin) Index() revel.Result {
    return c.Render()
}
