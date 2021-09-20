import React from 'react'
import { Route, Switch } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Home from './Home'
import './App.css'

const appTitle = 'nodeapp'

export default function App() {
  return (
    <>
      <Helmet
        htmlAttributes={{ lang: 'en-US' }}
        defaultTitle={appTitle}
        titleTemplate={`${appTitle} | %s`}
      >
        <meta charSet="utf-8" />
        <meta httpEquiv="Content-Language" content="en" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Helmet>
      <Switch>
        <Route path="/" component={Home} />
      </Switch>
    </>
  )
}
