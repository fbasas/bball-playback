describe('Baseball Playback Application', () => {
  beforeEach(() => {
    // Visit the application before each test
    cy.visit('/');
  });

  it('should load the application successfully', () => {
    // Check that the main components are rendered
    cy.get('h1').should('contain', 'Baseball Playback');
    cy.get('.scoreboard').should('be.visible');
    cy.get('.lineup-panel').should('be.visible');
  });

  it('should create a new game', () => {
    // Click the "New Game" button
    cy.get('button').contains('New Game').click();
    
    // Select teams
    cy.get('select[name="homeTeam"]').select('HOME_TEAM');
    cy.get('select[name="visitingTeam"]').select('AWAY_TEAM');
    
    // Start the game
    cy.get('button').contains('Start Game').click();
    
    // Verify the game is created
    cy.get('.scoreboard').should('contain', 'HOME');
    cy.get('.scoreboard').should('contain', 'AWAY');
    cy.get('.inning').should('contain', '1st');
  });

  it('should advance to the next play', () => {
    // Create a game first
    cy.get('button').contains('New Game').click();
    cy.get('select[name="homeTeam"]').select('HOME_TEAM');
    cy.get('select[name="visitingTeam"]').select('AWAY_TEAM');
    cy.get('button').contains('Start Game').click();
    
    // Initial state check
    cy.get('.outs').should('contain', '0');
    
    // Click the "Next Play" button
    cy.get('button').contains('Next Play').click();
    
    // Wait for the play to be processed
    cy.wait(1000);
    
    // Verify the play was processed
    cy.get('.game-log').should('not.be.empty');
    
    // Click "Next Play" again
    cy.get('button').contains('Next Play').click();
    
    // Wait for the play to be processed
    cy.wait(1000);
    
    // Verify the game state has changed
    cy.get('.game-log').children().should('have.length.at.least', 2);
  });

  it('should display lineup information correctly', () => {
    // Create a game first
    cy.get('button').contains('New Game').click();
    cy.get('select[name="homeTeam"]').select('HOME_TEAM');
    cy.get('select[name="visitingTeam"]').select('AWAY_TEAM');
    cy.get('button').contains('Start Game').click();
    
    // Check that lineups are displayed
    cy.get('.lineup-panel').should('contain', 'HOME');
    cy.get('.lineup-panel').should('contain', 'AWAY');
    
    // Check that the current batter is highlighted
    cy.get('.current-batter').should('be.visible');
  });

  it('should handle errors gracefully', () => {
    // Try to advance play without creating a game
    cy.visit('/');
    cy.get('button').contains('Next Play').click();
    
    // Check for error message
    cy.get('.error-message').should('be.visible');
    cy.get('.error-message').should('contain', 'No active game');
  });
});