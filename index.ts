import net from 'net'
import minimist from 'minimist'

const pairings: {[port: number]: string} = {}

const getProxyParams = (data: string) => {
  let host = ""
  let port = 80
  let isTLS = false
  const TLSHostPort = data.match(/CONNECT (?<host>.+):(?<port>\d+) /)?.groups
  if (TLSHostPort) {
    isTLS = true
    host = TLSHostPort.host
    port = parseInt(TLSHostPort.port)
  } else {
    const hostPort = data.match(/Host: (?<host>.+?)(?:\r\n|\:(?<port>\d+)\r\n)/)?.groups
    if (hostPort) {
      host = hostPort.host
      if (hostPort.port)
        port = parseInt(hostPort.port)
    }
  }
  return {host, port, isTLS}
}

let clientId = 0
const onServerConnection = (client: net.Socket) => {
  clientId += 1
  if (argv.verbose)
    console.log(`${clientId} - connected`)

  client.once('data', (dataRaw) => {
    let data = dataRaw.toString()
    const {host, port, isTLS} = getProxyParams(data)
    if (argv.verbose)
      console.log(`${clientId} - ${host}:${port} (${isTLS ? "secure" : "unsecure"})`)

    data = data.replace(/^Proxy-.*\r\n/gm, "")
    if (argv.logrequest)
      console.log(data)

    let remoteServer = net.createConnection({localAddress: pairings[client.localPort], host, port}, () => {
      if (isTLS)
        client.write('HTTP/1.1 200 OK\r\n\n');
      else
        remoteServer.write(data)

      client.pipe(remoteServer)
      remoteServer.pipe(client)
    })

    remoteServer.on('error', (err) => {
      if (argv.verbose)
        console.log(`${clientId} - ERR (${err.message})`)
    })
    remoteServer.on('close', () => {
      client.destroy()
    })

    client.on('error', err => {
      console.log(`${clientId} - ERR (${err.message})`)
    })
  })
}

const argv = minimist(process.argv.slice(2))
const serverArgs = typeof argv.server === 'string' ? [argv.server] : argv.server

const servers: net.Server[] = []
for (const pairing of serverArgs) {
  console.log(`checking argv '${pairing}'`)
  const portInterface = pairing.match(/\s*?(?<port>\d+)\:(?<interface>.+)/)
  if (!portInterface) {
    console.log(`Invalid port:interface mapping: ${portInterface}`)
    process.exit(1)
  }
  pairings[portInterface.groups.port] = portInterface.groups.interface

  const server = net.createServer()
  server.on("error", (err) => console.log(`Server ${portInterface.groups.port} error: ${err.message}`))
  server.on("close", () => console.log(`Server ${portInterface.groups.port} closed`))
  server.on("connection", onServerConnection)

  server.listen(portInterface.groups.port, () => {
    console.log(`Proxying from port ${portInterface.groups.port} via ${portInterface.groups.interface}`)
  })
  servers.push(server)
}

function handleExit(signal: string) {
  console.log(`Received ${signal}. Have a wonderful day!`)
  process.exit(0)
}
process.on('SIGINT', handleExit)
process.on('SIGQUIT', handleExit)
process.on('SIGTERM', handleExit)
