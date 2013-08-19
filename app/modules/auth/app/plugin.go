package auth

import (
	"github.com/robfig/revel"
	"reflect"
	//_ "github.com/slogsdon/acvte/modules/auth/routes"
)

type AuthenticatedResource struct {
	Resource interface{}
	Role     string
}

func init() {
	revel.OnAppStart(func() {

	})
}

var SessionAuthenticationFilter = func(c *revel.Controller, fc []revel.Filter) {
	// TODO: Fix redirect
	//c.Redirect()
}

func AclApply(m []AuthenticatedResource) {
	// revel.FilterController(controllers.Admin{}).
	//  Add(AuthenticationFilter)
	for _, a := range m {
		var fc revel.FilterConfigurator
		if reflect.TypeOf(a.Resource).Kind() == reflect.Func {
			// revel action
			fc = revel.FilterAction(a.Resource)
		} else {
			// revel controller
			fc = revel.FilterController(a.Resource)
		}
		fc.Add(SessionAuthenticationFilter)
	}
}

// func GetRole(u *models.User) string {
//     return "user"
// }

// func GetUser() *models.User {
//     u := new(models.User)
//     return u
// }
