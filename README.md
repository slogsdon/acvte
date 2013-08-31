# acvte [![wercker status](https://app.wercker.com/status/190ae2749b05de7d4b99f5a2a205fd39 "wercker status")](https://app.wercker.com/project/bykey/190ae2749b05de7d4b99f5a2a205fd39)

A markdown blog based off of @natew's 
[obtvse2](https://github.com/natew/obtvse2), which was originally 
inspired by [svbtle](https://svbtle.com), using Today theme contributed to 
obtvse2 by [@shilov](https://github.com/shilov). This is basically a direct 
port of obtvse2 using the [revel framework](http://robfig.github.io/revel/) 
for go, and I don't mean for it to be any more than that. This project was 
just an exercise in getting comfortable with go and revel.

### Note

As of this writing, revel and acvte are still in a state of high development. 
They should be stable enough for a production environment, but there are 
no guarantees.

## Getting Started

After [getting started and installing go](http://golang.org/doc/install), 
using acvte is easy. Assuming your `$GOPATH` is setup correctly:

    # Install the revel cli
    $ go get github.com/robfig/revel/revel
    # Grab a copy of acvte
    $ go get github.com/slogsdon/acvte    
    # Run locally for testing with
    $ revel run github.com/slogsdon/acvte
    # Build a production release with
    $ revel build github.com/slogsdon/acvte /path/to/save/build
    
## Configuring
        
Configuring acvte for your database is as easy as editing 
`src/github.com/slogsdon/acvte/conf/app.conf` in your build directory. 
Currently, MySQL, Postgres, SQLite3 are supported. Just look for the entries 
starting with `db.`, and plug in your settings. The only required items are 
`db.driver` and `db.dbname` as your chosen driver should use defaults for 
the others if they apply.

## TODO

- Figure out why auth works locally, but not remotely
- Create a new default design (?)
- Look into allowing environment variables for database configuration
- Generate migrations for database schema, or at the very least, add a schema dump to git
- Allow for MongoDB support with mgo

## License

See the [LICENSE](https://github.com/slogsdon/acvte/blob/master/LICENSE) file.


[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/77743a512302446b1bebcee204350425 "githalytics.com")](http://githalytics.com/slogsdon/acvte)
