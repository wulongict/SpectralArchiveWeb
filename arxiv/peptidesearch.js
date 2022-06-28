function get_spectra_by_peptide() {
    var peptide = $("#Peptide_Sequence").val();
    // var topN = $("#topn").val();


    var http = new XMLHttpRequest();
    var port = document.URL.split("/")[2].split(":")[1];
    var hostname=window.location.hostname;
    var base_url = "http://"+ hostname +":"+ port;
    var url = base_url + "/peptideseq";

    var params = 'Peptide_Sequence=' + peptide;
    console.log('invalid url ', url );
    http.open('POST', url, true);
    http.timeout = 25000;

    //Send the proper header information along with the request
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');


    http.onreadystatechange = function () {//Call a function when the state changes.
        if (this.readyState == 4 && this.status == 200) {

            var pktext = this.responseText;
            pktext = pktext.trim();
            console.log('we got: ', pktext);
            var graph = JSON.parse(this.responseText)
            console.log(graph);

            table = $('#PSM_List').DataTable();

            table.clear().draw();
            console.log("clear");
            var table = $('#PSM_List').DataTable();
            // console.log("show data:", graph.nodes);
            let nodesdata = [];
            let keys = ['id', 'peptide', 'filename','scan', 'score', 'pProb', 'iProb', 'precursor', 'charge', 'cterm', 'nterm', 'othermod', 'rt'];
            for (i in graph.nodes) {
                let y = {};
                for (j in keys) {
                    y[keys[j]] = graph.nodes[i][keys[j]];
                }
                console.log("new data", y);
                nodesdata.push(y);
            }


            console.log("refresh!", nodesdata);
            table.rows.add(nodesdata).draw();
            

        }

    }

    http.send(params);

}

function get_spectra_by_filename_and_scanrange() {
    var filename = $("#filename").val();
    var start = $("#startscan").val();
    var end = $("#endscan").val();
    // var topN = $("#topn").val();


    var http = new XMLHttpRequest();
    var port = document.URL.split("/")[2].split(":")[1];
    var hostname=window.location.hostname;
    var base_url = "http://"+ hostname +":"+ port;
    var url = base_url + "/peptideseq";

    var params = 'FILENAME=' + filename+";"+ 'STARTSCAN='+start +";"+"ENDSCAN="+end;
    console.log("searching for file with url \n ", url, ' and param: ', params)
    http.open('POST', url, true);
    http.timeout = 25000;

    //Send the proper header information along with the request
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');


    http.onreadystatechange = function () {//Call a function when the state changes.
        if (this.readyState == 4 && this.status == 200) {

            var pktext = this.responseText;
            pktext = pktext.trim();
            // console.log('we got: ', pktext);
            var graph = JSON.parse(this.responseText)
            // console.log(graph);

            table = $('#PSM_List').DataTable();

            table.clear().draw();
            console.log("clear");
            var table = $('#PSM_List').DataTable();
            // console.log("show data:", graph.nodes);
            let nodesdata = [];
            let keys = ['id', 'peptide', 'filename','scan', 'score', 'pProb', 'iProb', 'precursor', 'charge', 'cterm', 'nterm', 'othermod', 'rt'];
            for (i in graph.nodes) {
                let y = {};
                for (j in keys) {
                    y[keys[j]] = graph.nodes[i][keys[j]];
                }
                // console.log("new data", y);
                nodesdata.push(y);
            }


            // console.log("refresh!", nodesdata);
            table.rows.add(nodesdata).draw();


        }

    }

    http.send(params);

}


function addNavigationBar()
{
    var navbar_html_string=String.raw`<nav class="navbar navbar-expand-sm navbar-expand-lg navbar-dark bg-primary">
    <!-- Navbar content -->
    <!-- <nav class="navbar  navbar-light bg-light"> -->
    <a class="navbar-brand" href="#">Home</a>
    <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarText" aria-controls="navbarText" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarText">
      <ul class="navbar-nav mr-auto">
        <li class="nav-item">
          <a class="nav-link" href="/">Spectral Cluster </a>
        </li>
        <li class="nav-item active">
          <a class="nav-link" href="/peptidesearch.html">Peptide Search <span class="sr-only">(current)</span> </a>
        </li>
         <li class="nav-item ">
          <a class="nav-link" href="/filesearch.html">File Search  </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/cloudsearch.html">Cloud Search</a>
        </li>
      </ul>
      <span class="navbar-text">
        Clustering
      </span>
    </div>
  </nav>`

    $("#archive_navigation_bar").html(navbar_html_string);
}

function addNavigationBarForFileSearch()
{
    var navbar_html_string=String.raw`<nav class="navbar navbar-expand-sm navbar-expand-lg navbar-dark bg-primary">
    <!-- Navbar content -->
    <!-- <nav class="navbar  navbar-light bg-light"> -->
    <a class="navbar-brand" href="#">Home</a>
    <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarText" aria-controls="navbarText" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarText">
      <ul class="navbar-nav mr-auto">
        <li class="nav-item">
          <a class="nav-link" href="/">Spectral Cluster </a>
        </li>
        <li class="nav-item ">
          <a class="nav-link" href="/peptidesearch.html">Peptide Search </a>
        </li>
        <li class="nav-item active">
          <a class="nav-link" href="/filesearch.html">File Search <span class="sr-only">(current)</span> </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/cloudsearch.html">Cloud Search</a>
        </li>
      </ul>
      <span class="navbar-text">
        Clustering
      </span>
    </div>
  </nav>`

    $("#archive_navigation_bar").html(navbar_html_string);
}