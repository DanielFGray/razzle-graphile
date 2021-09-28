import React from 'react'
import { Route, Switch } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Home from './Home'
import './App.css'
import Settings from './Settings'
import SignUp from './SignUp'
import SignIn from './SignIn'
import NotFound from './NotFound'

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
        <Route path="/settings" component={Settings} />
        <Route path="/signup" component={SignUp} />
        <Route path="/signin" component={SignIn} />
        <Route exact path="/" component={Home} />
        <Route render={NotFound} />
      </Switch>
    </>
  )
}
