# razzle-graphile

a typescript+react boilerplate that generates a graphql api and types from postgres tables, and includes user session auth

## getting started

make sure you have `yarn`, `docker` and `docker-compose` installed

```
yarn
yarn setup
yarn start
```

the setup script will generate an `.env` file, launch a postgres container via `docker-compose` and run migrations

## differences from graphile/starter

* less opinionated UI
  * only provides the bare minimum UI code to make it easy to bring your own designs	
* [razzle](https://razzlejs.org) instead of Next.js
	* allows quicker page rebuilds during development (at the cost of slower startup)
  * `react-router` and `react-helmet-async` are used for routing and `<head>` metadata

### libraries used:
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
* [**graphql-codegen**](https://github.com/dotansimha/graphql-code-generator)
* [**apollo-client**](https://www.apollographql.com/docs/react/)

check the `package.json` for more

## credits

most of this is ~~stolen~~ borrowed from [graphile/starter](https://github.com/graphile/starter), ive just tried to make it work with razzle and apollo v3
