import { PlayerService, PlayerInfo } from '../PlayerService';
import { playerRepository } from '../../../../database/repositories/PlayerRepository';

// Mock the playerRepository
jest.mock('../../../../database/repositories/PlayerRepository', () => ({
  playerRepository: {
    getPlayerById: jest.fn(),
    getPlayersByIds: jest.fn(),
    clearCache: jest.fn(),
    getPlayerName: jest.fn()
  }
}));

describe('PlayerService', () => {
  // Sample player data for testing
  const mockPlayer: PlayerInfo = {
    id: 'player123',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe'
  };

  const mockPlayer2: PlayerInfo = {
    id: 'player456',
    firstName: 'Jane',
    lastName: 'Smith',
    fullName: 'Jane Smith'
  };

  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = PlayerService.getInstance();
      const instance2 = PlayerService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getPlayerById', () => {
    it('should return null when playerId is null', async () => {
      const result = await PlayerService.getPlayerById(null);
      expect(result).toBeNull();
      expect(playerRepository.getPlayerById).not.toHaveBeenCalled();
    });

    it('should return null when playerId is undefined', async () => {
      const result = await PlayerService.getPlayerById(undefined);
      expect(result).toBeNull();
      expect(playerRepository.getPlayerById).not.toHaveBeenCalled();
    });

    it('should return player info when playerId is valid', async () => {
      (playerRepository.getPlayerById as jest.Mock).mockResolvedValue(mockPlayer);
      
      const result = await PlayerService.getPlayerById('player123');
      
      expect(result).toEqual(mockPlayer);
      expect(playerRepository.getPlayerById).toHaveBeenCalledWith('player123');
    });

    it('should handle repository errors', async () => {
      (playerRepository.getPlayerById as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(PlayerService.getPlayerById('player123')).rejects.toThrow('Database error');
      expect(playerRepository.getPlayerById).toHaveBeenCalledWith('player123');
    });
  });

  describe('getPlayersByIds', () => {
    it('should return empty map when playerIds array is empty', async () => {
      const result = await PlayerService.getPlayersByIds([]);
      expect(result).toEqual(new Map());
      expect(playerRepository.getPlayersByIds).not.toHaveBeenCalled();
    });

    it('should return map of player info when playerIds are valid', async () => {
      const mockPlayerMap = new Map<string, PlayerInfo>([
        ['player123', mockPlayer],
        ['player456', mockPlayer2]
      ]);
      
      (playerRepository.getPlayersByIds as jest.Mock).mockResolvedValue(mockPlayerMap);
      
      const result = await PlayerService.getPlayersByIds(['player123', 'player456']);
      
      expect(result).toEqual(mockPlayerMap);
      expect(playerRepository.getPlayersByIds).toHaveBeenCalledWith(['player123', 'player456']);
    });

    it('should handle repository errors', async () => {
      (playerRepository.getPlayersByIds as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(PlayerService.getPlayersByIds(['player123'])).rejects.toThrow('Database error');
      expect(playerRepository.getPlayersByIds).toHaveBeenCalledWith(['player123']);
    });
  });

  describe('clearCache', () => {
    it('should call repository clearCache method', () => {
      PlayerService.clearCache();
      expect(playerRepository.clearCache).toHaveBeenCalled();
    });
  });

  describe('getPlayerName', () => {
    it('should return null when playerId is null', async () => {
      const result = await PlayerService.getPlayerName(null);
      expect(result).toBeNull();
      expect(playerRepository.getPlayerName).not.toHaveBeenCalled();
    });

    it('should return null when playerId is undefined', async () => {
      const result = await PlayerService.getPlayerName(undefined);
      expect(result).toBeNull();
      expect(playerRepository.getPlayerName).not.toHaveBeenCalled();
    });

    it('should return player name when playerId is valid', async () => {
      (playerRepository.getPlayerName as jest.Mock).mockResolvedValue('John Doe');
      
      const result = await PlayerService.getPlayerName('player123');
      
      expect(result).toBe('John Doe');
      expect(playerRepository.getPlayerName).toHaveBeenCalledWith('player123');
    });

    it('should handle repository errors', async () => {
      (playerRepository.getPlayerName as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(PlayerService.getPlayerName('player123')).rejects.toThrow('Database error');
      expect(playerRepository.getPlayerName).toHaveBeenCalledWith('player123');
    });
  });

  // Test instance methods as well
  describe('instance methods', () => {
    let service: PlayerService;

    beforeEach(() => {
      service = new PlayerService();
    });

    it('should call repository methods from instance methods', async () => {
      (playerRepository.getPlayerById as jest.Mock).mockResolvedValue(mockPlayer);
      
      const result = await service.getPlayerById('player123');
      
      expect(result).toEqual(mockPlayer);
      expect(playerRepository.getPlayerById).toHaveBeenCalledWith('player123');
    });
  });
});