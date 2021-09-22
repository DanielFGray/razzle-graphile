# razzle-graphile

a [currently work-in-progress] boilerplate that uses
* [**postgraphile**](https://graphile.org/postgraphile)
* [**graphile-worker**](https://github.com/graphile/worker)
* [**graphile-migrate**](https://github.com/graphile/migrate)
* [**razzle**](https://razzlejs.org)
* [**react**](https://reactjs.org)
* [**react-router**](https://reactrouter.com)
* [**react-helmet-async**](https://github.com/staylor/react-helmet-async)
* [**express**](https://expressjs.com)
* [**express-session**](https://github.com/expressjs/session)
* [**passport**](http://www.passportjs.org/)

## getting started

```
yarn
yarn setup
yarn start
```

the setup script will generate an `.env` file, launch a postgres container via `docker-compose` and run
