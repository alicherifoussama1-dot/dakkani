// Production entry for Namecheap (CloudLinux Passenger): Passenger sets PORT
// and proxies the domain to this process.
const { createServer } = require('http')
const next = require('next')

const port = Number(process.env.PORT || 3000)
const app = next({ dev: false, dir: __dirname })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`commerco ready on port ${port}`)
  })
})
