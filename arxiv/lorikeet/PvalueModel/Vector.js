class Vector extends Array {
    /**
     * 
     * @param {Number | Array<Number>} X 
     */
    constructor(X) {
        if (!X)
            super();
        else
            switch (X.constructor.name) {
                case "Number":
                    super(X);
                    this.fill(0);
                    break;
                case "Array":
                    X.forEach(val => {
                        if (val.constructor.name != "Number")
                            throw Error("arg error");
                    });
                    super(X.length);
                    X.forEach((val, i) => this[i] = val);
                    break;
                default:
                    throw Error("unsupported type")
            }
    }

    get last() {
        return this[this.length - 1]
    }

    set last(val) {
        this[this.length - 1] = val;
    }

    /**
     * 
     * @param {Vector | Function} F 
     * @returns {Vector}
     */
    filter(F) {
        if (F.constructor.name == "Function")
            return super.filter(F);
        else if (F.constructor.name == "Vector")
            if (this.length == F.length)
                return super.filter((val, i) => F[i]);
        else
            throw Error("arg error");
        return this;
    }

    /**
     * sum of this vector
     */
    sum() {
        return this.reduce((value, x) => value + x, 0);
    }

    /**
     * average of this vector.
     */
    avg() {
        return this.reduce((value, x) => value + x / this.length, 0);
    }

    /**
     * sample variance of this vector.
     */
    var() {
        const avg = this.avg(), N = this.length - 1;
        return this.reduce((value, x) => value + (x - avg) * (x - avg) / N, 0);
    }

    /**
     * sample standard deviation of this vector.
     */
    std() {
        return Math.sqrt(this.var());
    }

    /**
     * L2 norm of this vector.
     */
    norm() {
        return Math.sqrt(this.dot(this));
    }

    argmax() {
        return this.reduce((val, x, i) => x > this[val] ? i : val, 0);
    }

    max() {
        return this[this.argmax()];
    }

    argmin() {
        return this.reduce((val, x, i) => x < this[val] ? i : val, 0);
    }

    min() {
        return this[this.argmin()];
    }

    /**
     * Covariance of 2 vectors
     * @param {Vector} X 
     * @param {Vector} Y 
     * @returns {Number}
     */
    static cov(X, Y) {
        const X_avg = X.avg(), Y_avg = Y.avg(), N = X.length - 1;
        return Vector.NaryReduce((val, i, x, y) => val + (x - X_avg) * (y - Y_avg) / N, 0, X, Y);
    }

    /**
     * Pearson correlation of 2 vectors, X and Y.
     * @param {Vector} X 
     * @param {Vector} Y 
     */
    static corr(X, Y) {
        return this.cov(X, Y) / (X.std() * Y.std());
    }

    static linspace(lb, ub, N) {
        const step = (ub - lb) / (N - 1);
        return new Vector(N).map((val, i) => lb + i * step);
    }

    /**
     * A multi-vector implementation of Array.map(...).
     * @param {(index: Number, ...values: Number, ...vectors: Vector) => any} callback
     * @param  {...Vector} vectors arguments of f
     * @returns {Vector}
     */
    static NaryMap(callback, ...vectors) {
        const N = vectors[0].length, M = vectors.length;
        let length_valid = vectors.reduce((acc, vector) => acc && vector.length == N, true);
        if (length_valid) {
            let args = new Array(2 * M + 1);
            for (let i = 0; i < M; ++i)
                args[M + i + 1] = vectors[i];
            
            return new Vector(N).map((val, i) => {
                args[0] = i;
                for (let j = 0; j < M; ++j)
                    args[j + 1] = vectors[j][i];
                return callback.apply(null, args);
            });
        }
        else
            throw Error("arg error");
    }

    /**
     * A multi-vector implementation of Array.reduce(...).
     * @param {(previousValue: any, index: Number, ...values: Number, ...vectors: Vector) => any} callback 
     * @param {Number} initial_value 
     * @param  {...Vector} vectors 
     * @returns {any}
     */
    static NaryReduce(callback, initial_value, ...vectors) {
        const N = vectors[0].length, M = vectors.length;
        let length_valid = vectors.reduce((acc, vector) => acc && vector.length == N, true);
        if (length_valid) {
            let args = new Array(2 * M + 2);
            for (let i = 0; i < M; ++i)
                args[M + i + 2] = vectors[i];
            
            args[0] = initial_value;
            for (let i = 0; i < N; ++i) {
                args[1] = i;
                for (let j = 0; j < M; ++j)
                    args[j + 2] = vectors[j][i];
                args[0] = callback.apply(null, args);
            }

            return args[0];
        }
        else
            throw Error("arg error");
    }
}