package auth

import (
	"code.google.com/p/go.crypto/bcrypt"
	"github.com/robfig/revel"
	"github.com/robfig/revel/cache"
	"reflect"
	"time"
)

const (
	SESSION_KEY = "BasicAuthSessionId"
)

var (
	SessionId string
)

func init() {
	revel.OnAppStart(func() {
	})
}

// The actual filter added to the resource. It checks for valid session
// information and redirects the response to create a new session if it is not
// available or valid.
var SessionAuthenticationFilter = func(c *revel.Controller, fc []revel.Filter) {
	SessionId = c.Session.Id()
	// if valid := c.Session.CheckSession(c); !valid {
	// 	c.Flash.Error("Session invalid. Please login.")
	// 	c.Response.Status = http.StatusFound
	// 	c.Response.Out.Header().Add("Location", "/session/create")
	// }

	fc[0](c, fc[1:]) // Execute the next filter stage.
}

// CheckSession is called by SessionAuthenticationFilter to check for a valid
// session.
func CheckSession(c *revel.Controller) {
	result := false
	if value, ok := c.Session[SESSION_KEY]; ok {
		result = VerifySession(value)
	}
	if !result {
		c.Flash.Error("Session invalid. Please login.")
		c.Response.Status = 302
		c.Response.Out.Header().Add("Location", "/session/create")
	}
}

func RegisterSession(c *revel.Controller, hash string, password string) error {
	h := []byte(hash)
	p := []byte(password)
	SessionId = c.Session.Id()
	if err := bcrypt.CompareHashAndPassword(h, p); err != nil {
		return err
	}
	SetSession(c)
	return nil
}

func SetSession(c *revel.Controller) {
	c.Session[SESSION_KEY] = c.Session.Id()
	s := Session{
		Id:        c.Session.Id(),
		Data:      "true",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	cache.Set(c.Session.Id()+SESSION_KEY, s, 30*time.Minute)
}

func InvalidateSession() {
	go cache.Delete(SessionId + SESSION_KEY)
}

// VerifySession checks stored session id against stored value
func VerifySession(sid string) bool {
	var session Session
	if err := cache.Get(SessionId+SESSION_KEY, &session); err != nil {
		return false
	}
	return sid == session.Id
}

// Apply is run by the developer in the init.go file for his/her project.
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

// defines resource that needs authentication
type AuthenticatedResource struct {
	Resource interface{}
	Role     string // TODO: allow role-based ACL config
}

type Session struct {
	Id        string
	Data      string
	CreatedAt time.Time
	UpdatedAt time.Time
}
