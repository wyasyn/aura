import {
  findCompatibleIngredients,
  findConflictingIngredients,
  findIngredientsByCondition,
  recommendIngredients,
} from './ingredients';

console.log('Condition search:', findIngredientsByCondition('hydration'));
console.log('Compatible with Niacinamide:', findCompatibleIngredients('Niacinamide'));
console.log('Conflicting with Salicylic Acid:', findConflictingIngredients('Salicylic Acid'));
console.log('Recommended for oily skin:', recommendIngredients({ skinType: 'oily' }));
