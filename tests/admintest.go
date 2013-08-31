package tests

import "github.com/robfig/revel"

type AdminTest struct {
    revel.TestSuite
}

func (t *AdminTest) Before() {
    println("Set up")
}

func (t *AdminTest) TestThatAuthIsEnforced() {
    t.Get("/admin")
    //t.AssertStatus(302)
    t.AssertContains("Session invalid. Please login.")
}

func (t *AdminTest) After() {
    println("Tear down")
}
