# Albert Auto Class Swapper

## Installation

1. Make sure Node is installed in your system

2. Run `npm i` or `yarn` to install project dependencies

3. Check out [playwright documentation](https://playwright.dev/docs/intro/#installation) for browser installation

## Configuration

1. Rename `.env.sample` to `.env`

2. To enable WeChat push notifications, register an [WxPusher](https://wxpusher.zjiecode.com/admin/) account and follow instructions [here](https://wxpusher.zjiecode.com/docs/#/?id=%e5%bf%ab%e9%80%9f%e6%8e%a5%e5%85%a5) to create an `APPTOKEN`

3. Create a CRON schedule ([documentation](https://crontab.tech/))

4. Fill in required fields in `.env`

## Usage

### Running Once

```sh
node swap.js -o -v
```

### Service Mode

Make sure `pm2` is installed.

```sh
pm2 start ecosystem.config.js
```

## Options

Command-line Arguments for `swap.js`

```
      --version    Show version number                                 [boolean]
  -o, --once       Run once                           [boolean] [default: false]
  -v, --verbose    Run browser in non-headless mode      [boolean] [default: false]
  -f, --frequency  Run every x minutes                   [number] [default: "1"]
  -c, --cron       Cron Schedule            [string] [default: "0/20 * * * * *"]
  -h, --help       Show help                                           [boolean]
```
