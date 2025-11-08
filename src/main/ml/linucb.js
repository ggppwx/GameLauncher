/**
 * Simple LinUCB (Linear Upper Confidence Bound) implementation
 * for contextual bandit recommendation
 */

class LinUCB {
  constructor(contextDim, alpha = 1.0) {
    this.contextDim = contextDim;
    this.alpha = alpha; // Exploration parameter
    this.arms = new Map(); // Map of arm_id -> arm data
  }

  /**
   * Initialize an arm (game) if not exists
   */
  initArm(armId) {
    if (!this.arms.has(armId)) {
      this.arms.set(armId, {
        A: this.createIdentityMatrix(this.contextDim),
        b: new Array(this.contextDim).fill(0),
      });
    }
  }

  /**
   * Create identity matrix
   */
  createIdentityMatrix(size) {
    const matrix = [];
    for (let i = 0; i < size; i++) {
      matrix[i] = new Array(size).fill(0);
      matrix[i][i] = 1;
    }
    return matrix;
  }

  /**
   * Matrix multiplication: A * x
   */
  matrixVectorMult(A, x) {
    const result = [];
    for (let i = 0; i < A.length; i++) {
      let sum = 0;
      for (let j = 0; j < x.length; j++) {
        sum += A[i][j] * x[j];
      }
      result.push(sum);
    }
    return result;
  }

  /**
   * Vector dot product
   */
  dotProduct(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  /**
   * Outer product: x * x^T
   */
  outerProduct(x) {
    const result = [];
    for (let i = 0; i < x.length; i++) {
      result[i] = [];
      for (let j = 0; j < x.length; j++) {
        result[i][j] = x[i] * x[j];
      }
    }
    return result;
  }

  /**
   * Matrix inversion using Gaussian elimination (simplified for small matrices)
   */
  invertMatrix(A) {
    const n = A.length;
    const augmented = [];
    
    // Create augmented matrix [A | I]
    for (let i = 0; i < n; i++) {
      augmented[i] = [...A[i], ...new Array(n).fill(0)];
      augmented[i][n + i] = 1;
    }
    
    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      // Make all rows below this one 0 in current column
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
    
    // Back substitution
    for (let i = n - 1; i >= 0; i--) {
      for (let k = i - 1; k >= 0; k--) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
    
    // Normalize diagonal to 1
    for (let i = 0; i < n; i++) {
      const divisor = augmented[i][i];
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= divisor;
      }
    }
    
    // Extract inverse matrix
    const inverse = [];
    for (let i = 0; i < n; i++) {
      inverse[i] = augmented[i].slice(n);
    }
    
    return inverse;
  }

  /**
   * Calculate UCB score for an arm given context
   */
  score(armId, context) {
    this.initArm(armId);
    const arm = this.arms.get(armId);
    
    try {
      const A_inv = this.invertMatrix(arm.A);
      const theta = this.matrixVectorMult(A_inv, arm.b);
      
      // Expected reward
      const expectedReward = this.dotProduct(theta, context);
      
      // Uncertainty bonus
      const A_inv_x = this.matrixVectorMult(A_inv, context);
      const uncertainty = Math.sqrt(this.dotProduct(context, A_inv_x));
      
      // UCB score = expected reward + alpha * uncertainty
      return expectedReward + this.alpha * uncertainty;
    } catch (error) {
      console.error('Error computing LinUCB score:', error);
      return 0;
    }
  }

  /**
   * Update the model after observing reward
   */
  update(armId, context, reward) {
    this.initArm(armId);
    const arm = this.arms.get(armId);
    
    // Update A = A + x * x^T
    const xxT = this.outerProduct(context);
    for (let i = 0; i < this.contextDim; i++) {
      for (let j = 0; j < this.contextDim; j++) {
        arm.A[i][j] += xxT[i][j];
      }
    }
    
    // Update b = b + reward * x
    for (let i = 0; i < context.length; i++) {
      arm.b[i] += reward * context[i];
    }
  }

  /**
   * Serialize arm data for storage
   */
  serializeArm(armId) {
    const arm = this.arms.get(armId);
    if (!arm) return null;
    
    return {
      A: arm.A,
      b: arm.b,
    };
  }

  /**
   * Deserialize and load arm data
   */
  loadArm(armId, data) {
    if (data && data.A && data.b) {
      this.arms.set(armId, {
        A: data.A,
        b: data.b,
      });
    }
  }
}

module.exports = LinUCB;
