package app

import (
	"github.com/robfig/revel"
	"github.com/robfig/revel/modules/auth"
	"github.com/russross/blackfriday"
	c "github.com/slogsdon/acvte/app/controllers"
	m "github.com/slogsdon/acvte/app/models"
	"github.com/slogsdon/acvte/modules/db"
)

var aclMap = []auth.AuthenticatedResource{
	{Role: "user", Resource: c.Admin{}},
}

func init() {
	// Filters is the default set of global filters.
	revel.Filters = []revel.Filter{
		revel.PanicFilter,             // Recover from panics and display an error page instead.
		revel.RouterFilter,            // Use the routing table to select the right Action
		revel.FilterConfiguringFilter, // A hook for adding or removing per-Action filters.
		revel.ParamsFilter,            // Parse parameters into Controller.Params.
		revel.SessionFilter,           // Restore and write the session cookie.
		revel.FlashFilter,             // Restore and write the flash cookie.
		revel.ValidationFilter,        // Restore kept validation errors and save new ones from cookie.
		revel.I18nFilter,              // Resolve the requested language
		HeaderFilter,                  // Security-based headers
		revel.InterceptorFilter,       // Run interceptors around the action.
		revel.ActionInvoker,           // Invoke the action.
	}

	// template functions
	revel.TemplateFuncs["markdown"] = func(str string) string {
		output := blackfriday.MarkdownCommon([]byte(str))
		return string(output)
	}

	revel.OnAppStart(func() {
		auth.Apply(aclMap)
		auth.Use(auth.AuthStructs{
			User: m.User{},
			VerifyWith: func(u string) *m.User {
				user := new(m.User)
				err := db.Db.WhereEqual("username", u).Find(user)
				return user
			},
		})
	})
}

var HeaderFilter = func(c *revel.Controller, fc []revel.Filter) {
	// Add some common security headers
	c.Response.Out.Header().Add("X-Frame-Options", "SAMEORIGIN")
	c.Response.Out.Header().Add("X-XSS-Protection", "1; mode=block")
	c.Response.Out.Header().Add("X-Content-Type-Options", "nosniff")

	fc[0](c, fc[1:]) // Execute the next filter stage.
}
