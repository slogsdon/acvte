package tests

import "github.com/robfig/revel"

type PostsTest struct {
	revel.TestSuite
}

func (t *PostsTest) Before() {
	println("Set up")
}

func (t *PostsTest) TestThatIndexPageWorks() {
	t.Get("/")
	t.AssertOk()
	t.AssertContentType("text/html")
}

func (t *PostsTest) TestThatNonexistentPageYields404() {
    t.Get("/a-fake-page-that-doesnt-exist")
    t.AssertNotFound()
    t.AssertContentType("text/html")
}

func (t *PostsTest) After() {
	println("Tear down")
}
