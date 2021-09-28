# razzle-graphile

a typescript+react boilerplate that generates a graphql api and types from postgres tables, and includes user session auth

## getting started

make sure you have `yarn`, `docker` and `docker-compose` installed

```
yarn
yarn setup
```

> `npm` will *probably* work instead of `yarn` but it's not tested by the author

the setup script will generate an `.env` file if it doesnt exist, launch a postgres container via `docker-compose`, run migrations, and then call `yarn start`

when you're finished, you can `yarn db:stop` (an alias for `docker-compose stop`) to preserve your data, or `yarn db:down` will purge the docker volume and your data

## differences from graphile/starter

* less opinionated UI
  * only provides the bare minimum UI code to make it easy to bring your own designs	
* [razzle](https://razzlejs.org) instead of Next.js
	* allows quicker page rebuilds during development (at the cost of slower startup)
  * `react-router` and `react-helmet-async` are used for routing and `<head>` metadata

## roadmap

i'm aiming to achieve feature parity with [graphile/starter](https://github.com/graphile/starter) but there's still a lot to do, including:

- [ ] basic UI elements
- [ ] tests
- [ ] deployment strategies

check the issues if you're interested in helping!

## credits

most of this is ~~stolen~~ borrowed from [graphile/starter](https://github.com/graphile/starter), ive just tried to make it work with razzle and apollo v3
