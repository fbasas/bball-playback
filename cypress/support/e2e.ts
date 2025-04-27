// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
// import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Example of a simple custom command (uncomment to use)
/*
Cypress.Commands.add('login', (username, password) => {
  cy.visit('/login');
  cy.get('input[name=username]').type(username);
  cy.get('input[name=password]').type(password);
  cy.get('button[type=submit]').click();
});
*/

// If you need to declare custom commands, create a commands.ts file
// and add this to it:
/*
declare namespace Cypress {
  interface Chainable {
    login(username: string, password: string): Chainable<Element>
  }
}
*/