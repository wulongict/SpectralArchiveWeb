"use strict";

class Model extends React.Component {
    constructor(props) {
        super(props);
        this.element = React.createRef();
        this.state = {
            data: null
        };
        this.linear_model = null;
    }

    /**
     * always return false, d3 will handle the update here.
     * @param {*} nextProps 
     * @param {*} nextState 
     */
    shouldComponentUpdate(nextProps, nextState) {
        const $el = d3.select(this.element.current);
        const data = nextState.data;
        const style = nextProps.style;

        if (!data.backgroundscores) {
            this.clear();
            return;
        }

        let scores = Vector.from(data.backgroundscores);
        scores = scores.filter((x) => x < Constants.MAX_SCORE && x > Constants.MIN_SCORE);
        scores.sort((a, b) => b - a);

        /**@type {Histogram} */
        let hist = histogram(scores, Vector.linspace(Constants.MIN_SCORE, Constants.MAX_SCORE, 101), false);

        // lower bound of scores fit
        let lb = 0;
        let cum_sum = hist.freq.last;
        for (let i = hist.freq.length - 2; i > 0; --i) {
            cum_sum += hist.freq[i];
            if (hist.freq[i] >= hist.freq[i - 1] && hist.freq[i] >= hist.freq[i + 1] && cum_sum / scores.length > 0.1) {
                lb = i;
                break;
            }
        }

        // upper bound of scores fit
        let ub = hist.freq.length - 1;
        for (let i = lb; i < hist.freq.length; ++i)
            if (hist.freq[i] < 3) {
                ub = i;
                break;
            }

        // compute log(p) and log(1 - dp);
        let pvalue = new Vector(scores.length);
        pvalue[pvalue.length - 1] = pvalue.length;
        let i = pvalue.length - 2;
        let same_count = 1;
        while (i >= 0) {
            if (scores[i] == scores[i + 1]) {
                ++same_count;
                pvalue[i] = pvalue[i + 1]
            }
            else {
                pvalue[i] = pvalue[i + 1] - same_count;
                same_count = 1;
            }
            --i;
        }
        
        let filter = scores.map((val) => val >= hist.bins[lb] && val <= hist.bins[ub]);
        scores.forEach((val, i, arr) => {
            //arr[i] = Math.log10(1 - val / Constants.MAX_SCORE);
            arr[i] = -val / Constants.MAX_SCORE;
        });
        pvalue.forEach((val, i, arr) => {
            arr[i] = Math.log10(val / scores.length);
        });

        // apply the cuts
        let scores_fit = scores.filter(filter);
        let pvalue_fit = pvalue.filter(filter);

        // fit linear model
        this.linear_model = new LinearModel().fit(scores_fit, pvalue_fit);
        let pvalue_predicted = this.linear_model.predict(scores_fit);

        this.clear();

        // x-axis
        const x_axis = d3.scaleLinear()
                            .domain([scores[0], scores.last])
                            .range([style.leftMargin, style.width - style.rightMargin]);

        $el.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${style.height - style.verticalMargin})`)
            .call(d3.axisBottom(x_axis));

        $el.select(".x-axis")
            .append("text")
            .attr("x", style.leftMargin + (style.width - style.leftMargin - style.rightMargin) / 2)
            .attr("y", "25")
            .attr("stroke", "black")
            .style("text-anchor", "middle")
            .html(`-<tspan font-style="italic">dp</tspan>`);


        // y-axis
        const y_axis = d3.scaleLinear()
                        .domain([pvalue[0], pvalue.last])
                        .range([style.height - style.verticalMargin, style.verticalMargin]);

        $el.append("g")
            .attr("class", "y-axis")
            .attr("transform", `translate(${style.leftMargin}, 0)`)
            .call(d3.axisLeft(y_axis));

        $el.select(".y-axis")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", "-50%")
            .attr("y", "-30")
            .attr("stroke", "black")
            .style("text-anchor", "middle")
            .html(`log(<tspan font-style="italic">p</tspan>)`);

        // actual
        $el.select(".series-grp")
            .append("g")
            .attr("class", "series")
            .selectAll("circle")
            .data(Vector.NaryMap(
                (i, x, y) => new Object({x: x, y: y}), 
                scores,
                pvalue
            ))
            .enter()
            .append("circle")
            .attr("class", "point")
            .attr("fill", style.pointFill)
            .attr("cx", d => x_axis(d.x) + 1)
            .attr("cy", d => y_axis(d.y))
            .attr("r", style.pointRadius);


        // linear model
        $el.select(".series-grp")
            .append("g")
            .attr("class", "series")
            .append("path")
            .datum(Vector.NaryMap(
                (i, x, y) => new Object({x: x, y: y}),
                [scores_fit[0], scores_fit.last],
                [pvalue_predicted[0], pvalue_predicted.last]
            ))
            .attr("class", "series")
            .attr("x", 1)
            .attr("y", 0)
            .attr("fill", "none")
            .attr("stroke", style.olsStroke)
            .attr("stroke-width", style.lineWidth)
            .attr("d", d3.line()
                .x(d => x_axis(d.x) + 1)
                .y(d => y_axis(d.y))
            );

        // api
        let legendData = [{color: style.olsStroke, name: "Ordinary Least Squares", Rsq: Vector.corr(pvalue_fit, pvalue_predicted), sampleSize: scores_fit.length}];
        if (data.lrModel.rSquare != 0) {
            $el.select(".series-grp")
                .append("g")
                .attr("class", "series")
                .append("path")
                .datum(
                    [data.lrModel.minLog10Pvalue, data.lrModel.maxLog10Pvalue].map((y) => {
                        return {
                            x: -(y - data.lrModel.coef_intercept) / data.lrModel.coef_a,
                            y: y
                        }
                    })
                )
                .attr("class", "series")
                .attr("x", 1)
                .attr("y", 0)
                .attr("fill", "none")
                .attr("stroke", style.alsStroke)
                .attr("stroke-width", style.lineWidth)
                .attr("d", d3.line()
                    .x(d => x_axis(d.x) + 1)
                    .y(d => y_axis(d.y))
                );
            legendData.push({color: style.alsStroke, name: "Adaptive Least Squares", Rsq: data.lrModel.rSquare, sampleSize: data.lrModel.sampleSize});
        }

        // legend
        $el.select(".legend-grp")
            .selectAll(".legend")
            .data(legendData).enter()
            .append("g")
            .attr("class", "legend")
            .html(d => {
                return `<rect width="${style.legendSquareSize}" height="${style.legendSquareSize}" fill="${d.color}" stroke="${d.color}"/>
                        <text x="${style.legendSquareSize + style.legendSpacing}" y="${style.legendSquareSize - style.legendSpacing / 2}" style="font-size: 10px;">
                            ${d.name}, R<tspan baseline-shift="super">2</tspan> = ${d.Rsq.toFixed(4)}, <tspan font-style="italic">sample size</tspan> = ${d.sampleSize}
                        </text>
                        `;
            })
            .attr("transform", (d, i, elm) => {
                let BBox = elm[i].getBBox();
                return `translate(${style.width - BBox.width}, ${style.verticalMargin + (style.legendSquareSize + style.legendSpacing) * i})`;
            });

        return false;
    }

    componentWillUnmount() {
        d3.select(this.element.current).selectAll("*").remove();
    }

    clear() {
        const $el = d3.select(this.element.current);
        $el.select(".x-axis").remove();
        $el.select(".y-axis").remove();
        $el.select(".series-grp").selectAll(".series").remove();
        $el.select(".legend-grp").selectAll(".legend").remove();
    }

    render() {
        return /*#__PURE__*/React.createElement("svg", {
            ref: this.element,
            width: "100%",
            height: "100%",
            viewBox: `0 0 ${this.props.style.width} ${this.props.style.height}`
        }, React.createElement("g", {class: "plot"}, React.createElement("g", {class: "series-grp"})
        ), React.createElement("g", {class: "legend-grp"}));
    }
}

Model.defaultProps = {
    style: {
        width: 800,
        height: 800,
        verticalMargin: 30,
        leftMargin: 40,
        rightMargin: 10,
        legendSquareSize: 10,
        legendSpacing: 3,
        pointRadius: 2.5,
        pointFill: "lightgrey",
        olsStroke: "#32527B", // metallic-blue
        alsStroke: "#A62C2B", // metallic-red
        lineWidth: 2
    }
};

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {data: null};
        this.model = React.createRef();
    }

    render() {
        return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
            type: "text",
            onChange: async (event) => {
                const queryid = event.target.value;
                $.ajax({
                    type: "POST",
                    url: `http://spec.ust.hk:8709/id/${queryid}`,
                    data: `QUERYID=${queryid}TOPN=10EDGE=0NPROBE=2`,
                    async: true,
                    timeout: 25000,
                    dataType: "json",
                    contentType: "application/x-www-form-urlencoded",
                    success: (data, status, xhr) => {
                        if (xhr.readyState == 4 && xhr.status == 200) {
                            if (data.backgroundscores)
                                this.model.current.setState({data: data});
                        }
                    },
                    error: () => {this.model.current.setState({data: {}});}
                });
            }
        }), /*#__PURE__*/React.createElement(Model, {
            data: this.props.data,
            ref: this.model
        }));
    }
}

ReactDOM.render( /*#__PURE__*/React.createElement(App, null), document.getElementById("root"));


/**single variable linear model: y = slope * x + c */
class LinearModel {
    /**
     * fit the model using ordinary least squares.
     * @param {Vector} x independent variable
     * @param {Vector} y dependend variable
     */
    fit(x, y) {
        this.slope = Vector.cov(x, y) / x.var();
        this.intercept = y.avg() - this.slope * x.avg();
        return this;
    }

    /**
     * predict the outcome from given input.
     * @param {Vector | number} x 
     * @returns {Vector | number}
     */
    predict(x) {
        switch (x.constructor.name) {
            case "Number":
                return x * this.slope + this.intercept;
            case "Vector":
                return x.map(val => val * this.slope + this.intercept);
            default:
                throw Error("type not supported");
        }
    }
}

/**
 * @typedef Histogram
 * @property {Vector} bins
 * @property {Vector} freq
 */
/**
 * 
 * @param {Vector} data 
 * @param {Vector | number} bins
 * @param {boolean} density
 * @returns {Histogram}
 */
function histogram(data, bins, density = false, cumulative = false) {
    if (bins.constructor.name == "Number")
        bins = Vector.linspace(data.min(), data.max(), bins + 1);

    const step = (bins.last- bins[0]) / (bins.length - 1);
    let freq = new Vector(bins.length - 1);

    data.forEach(val => {
        // only works for regular intervals.
        // binary/linear search is needed for irregular intervals
        let index = Math.floor((val - bins[0]) / step);
        if (val == bins[bins.length - 1])
            index = freq.length - 1;
        if (index >= 0 && index <= freq.length - 1)
            freq[index] += 1;
    });

    if (density) {
        const auc = Vector.NaryReduce(
            (cum, i, F, BL, BR) => cum + F * (BR - BL),
            0,
            freq,
            bins.slice(0, -1),
            bins.slice(1),
        );
        freq.forEach((val, i, arr) => arr[i] /= auc);
    }
    
    if (cumulative)
        freq.reduce((cum, val, i, arr) => arr[i] += cum, 0);

    return {bins: bins, freq: freq};
}

/**
 * Constants
 */
class Constants {
    /**
     * upper bound of scores
     */
    static get MAX_SCORE() {
        return 42925;
    }

    static get MIN_SCORE() {
        return 0;
    }
}