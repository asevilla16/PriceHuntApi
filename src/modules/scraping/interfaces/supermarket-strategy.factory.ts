import { SupermarketColonialStrategy } from '../strategies/supermarket-colonial.strategy';
import { SupermarketLosAndesStrategy } from '../strategies/supermarket-losandes.strategy';

export class SupermarketStrategyFactory {
  static getStrategy(supermarket: string) {
    switch (supermarket) {
      case 'LosAndes':
        return new SupermarketLosAndesStrategy();
      case 'LaColonia':
        return new SupermarketColonialStrategy();
      default:
        throw new Error('Supermarket not found');
    }
  }
}
