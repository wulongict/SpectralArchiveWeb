// version May 28, 2023


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
    $("body").css("cursor", "progress");

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
            $("body").css("cursor", "default");
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
    ErrorInfo.show("Searching for file: "+filename+" with scan range: "+start+"-"+end, "info");
    table = $('#PSM_List').DataTable();

            table.clear().draw();
    // var topN = $("#topn").val();


    var http = new XMLHttpRequest();


    // var base_url = "http://"+ hostname +":"+ port;
    var url = window.location.origin + "/peptideseq";

    var params = 'FILENAME=' + filename+";"+ 'STARTSCAN='+start +";"+"ENDSCAN="+end;
    console.log("searching for file with url \n ", url, ' and param: ', params)
    http.open('POST', url, true);
    http.timeout = 25000;

    //Send the proper header information along with the request
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    $("body").css("cursor", "progress");

    http.onreadystatechange = function () {//Call a function when the state changes.
        if (this.readyState == 4 && this.status == 200) {

            var pktext = this.responseText;
            pktext = pktext.trim();
            // console.log('we got: ', pktext);
            var graph = JSON.parse(this.responseText)
            // console.log(graph);

            
            // console.log("clear: ", this.responseText, graph);
            
            $("body").css("cursor", "default");
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
            ErrorInfo.log("Data loaded! number of rows = "+nodesdata.length, "success")


        }

    }

    http.send(params);

}


function addNavigationBar()
{
  add_navigation_bar_cluster_page();
  
}

function addNavigationBarForFileSearch()
{

    console.log('add nav bar to file search');
  add_navigation_bar("filesearch");
  
}