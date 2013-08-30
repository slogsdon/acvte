package app

import (
	"github.com/robfig/revel"
	"github.com/russross/blackfriday"
	// m "github.com/slogsdon/acvte/app/models"
	// "github.com/coocood/qbs"
	// _ "github.com/go-sql-driver/mysql"
)

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
		TemplateInfoFilter,			   // Add some RenderArgs for general info
		revel.InterceptorFilter,       // Run interceptors around the action.
		revel.ActionInvoker,           // Invoke the action.
	}

	// template functions
	revel.TemplateFuncs["markdown"] = func(str string) string {
		// this did use blackfriday.MarkdownCommon, but it was stripping out <script>
		input := []byte(str)

		htmlFlags := 0
		htmlFlags |= blackfriday.HTML_USE_XHTML
		htmlFlags |= blackfriday.HTML_USE_SMARTYPANTS
		htmlFlags |= blackfriday.HTML_SMARTYPANTS_FRACTIONS
		htmlFlags |= blackfriday.HTML_SMARTYPANTS_LATEX_DASHES
		renderer := blackfriday.HtmlRenderer(htmlFlags, "", "")

		// set up the parser
		extensions := 0
		extensions |= blackfriday.EXTENSION_NO_INTRA_EMPHASIS
		extensions |= blackfriday.EXTENSION_TABLES
		extensions |= blackfriday.EXTENSION_FENCED_CODE
		extensions |= blackfriday.EXTENSION_AUTOLINK
		extensions |= blackfriday.EXTENSION_STRIKETHROUGH
		extensions |= blackfriday.EXTENSION_SPACE_HEADERS

		output := blackfriday.Markdown(input, renderer, extensions)
		return string(output)
	}

	// revel.OnAppStart(func () {
	// 	if err := CreateUserTable(); err != nil {
	// 		revel.ERROR.Fatal(err)
	// 	}
	// })
}

var HeaderFilter = func(c *revel.Controller, fc []revel.Filter) {
	// Add some common security headers
	c.Response.Out.Header().Add("X-Frame-Options", "SAMEORIGIN")
	c.Response.Out.Header().Add("X-XSS-Protection", "1; mode=block")
	c.Response.Out.Header().Add("X-Content-Type-Options", "nosniff")

	fc[0](c, fc[1:]) // Execute the next filter stage.
}

var TemplateInfoFilter = func(c *revel.Controller, fc []revel.Filter) {
	c.RenderArgs["info"] = map[string]string {
		"name":       revel.Config.StringDefault("info.name", ""),
		"tagline":    revel.Config.StringDefault("info.tagline", ""),
		"email":      revel.Config.StringDefault("info.email", ""),
		"twitter":    revel.Config.StringDefault("info.twitter", ""),
		"github":     revel.Config.StringDefault("info.github", ""),
		"use_ga":     revel.Config.StringDefault("info.use_ga", "false"),
		"ga_id":      revel.Config.StringDefault("info.ga_id", ""),
		"use_gauges": revel.Config.StringDefault("info.use_gauges", "false"),
		"gauges_id":  revel.Config.StringDefault("info.gauges_id", ""),
		"domain":     revel.Config.StringDefault("info.domain", ""),
		"use_disqus": revel.Config.StringDefault("info.use_disqus", "false"),
		"disqus_id":  revel.Config.StringDefault("info.disqus_id", ""),
	}

	fc[0](c, fc[1:])
}

// func CreateUserTable() error {
//     migration, err := qbs.GetMigration()
//     if err != nil {
//         return err
//     }
//     defer migration.Close()
//     return migration.CreateTableIfNotExists(new(m.User))
// }
