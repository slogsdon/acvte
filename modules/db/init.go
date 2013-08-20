package db

import (
    "github.com/coocood/qbs"
    _ "github.com/go-sql-driver/mysql"
    "github.com/robfig/revel"
    "fmt"
    "strings"
)

var (
    Db       *qbs.Qbs
    Driver   string
    User     string
    Password string
    Protocol string
    Address  string
    DbName   string
    Params   string
    err      error
)

func init() {
    revel.OnAppStart(func () {
        var (
            found   bool
            spec    []string
            dialect qbs.Dialect
        )

        if Driver, found = revel.Config.String("db.driver"); !found {
            revel.ERROR.Fatal("No db.driver found.")
        }
        switch strings.ToLower(Driver) {
        case "mysql":
            dialect = qbs.NewMysql()
        case "postgres":
            dialect = qbs.NewPostgres()
        case "sqlite3":
            dialect = qbs.NewSqlite3()
        }

        // Start building the spec from available config options
        if User, found = revel.Config.String("db.user"); found {
            spec = append(spec, User)
            if Password, found = revel.Config.String("db.password"); found {
                spec = append(spec, fmt.Sprintf(":%v", Password))
            }
            spec = append(spec, "@")
        }
        if Protocol, found = revel.Config.String("db.protocol"); found {
            spec = append(spec, Protocol)
            if Address, found = revel.Config.String("db.address"); found {
                spec = append(spec, fmt.Sprintf("(%v)", Address))
            }
        }
        if DbName, found = revel.Config.String("db.dbname"); !found {
            revel.ERROR.Fatal("No db.dbname found.")
        }
        spec = append(spec, fmt.Sprintf("/%v", DbName))
        if Params, found = revel.Config.String("db.params"); found {
            spec = append(spec, fmt.Sprintf("?%v", Params))
        }

        qbs.Register(Driver, strings.Join(spec, ""), DbName, dialect)
        Db, err = qbs.GetQbs()
        defer Db.Close()
    })
}