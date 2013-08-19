package auth

import (
	"github.com/robfig/revel"
	"net/http"
	"reflect"
)

type AuthenticatedResource struct {
	Resource interface{}
	Role     string // will be implemented later for role-based ACL config
}

func init() {}

// The actual filter added to the resource. It checks for valid session
// information and redirects the response to create a new session if it is not
// available or valid.
var SessionAuthenticationFilter = func(c *revel.Controller, fc []revel.Filter) {
	if !false { // TODO: check for session information
		c.Flash.Error("Session invalid. Please login.")
		c.Response.Status = http.StatusFound
		c.Response.Out.Header().Add("Location", "/session/create")
	}

	fc[0](c, fc[1:]) // Execute the next filter stage.
}

// auth.Apply is run by the developer in the init.go file for his/her project.
// It loops over the slice for all AuthenticatedResources the developer wishes
// to be protected with authentication.
func Apply(m []AuthenticatedResource) {
	for _, a := range m {
		var fc revel.FilterConfigurator
		if reflect.TypeOf(a.Resource).Kind() == reflect.Func {
			fc = revel.FilterAction(a.Resource)
		} else {
			fc = revel.FilterController(a.Resource)
		}
		fc.Add(SessionAuthenticationFilter)
	}
}
