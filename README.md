# acvte

A markdown blog based off of @natew's 
[obtvse2](https://github.com/natew/obtvse2), which was originally 
inspired by [svbtle](https://svbtle.com). This is basically a direct 
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

- Finish the admin
- Look into allowing environment variables for database configuration
- Generate migrations for database schema, or at the very least, add a schema dump to git

## License

The MIT License (MIT)

Copyright (c) 2013 Shane Logsdon

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/77743a512302446b1bebcee204350425 "githalytics.com")](http://githalytics.com/slogsdon/acvte)
