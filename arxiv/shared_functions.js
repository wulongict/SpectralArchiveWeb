function openInNewTab(url) {
    var win = window.open(url, '_blank');
    win.focus();
  }


function getDB(db)
{
    console.log('we opened db: ', db);
}

function openDB() {
 var DBOpenRequest = window.indexedDB.open("toDoList");
 DBOpenRequest.onsuccess = function(e) {
   var db = DBOpenRequest.result;
   getDB(db);
 };
}

function getPTMs(){
  var ptmMass = {
    // to continue! add more UniMod entries
  }
}


function getAAMass()
{
  var aamass = {
    'A': 71.03711,
    'C': 103.00918,
    'D': 115.02694,
    'E': 129.04259,
    'F': 147.06841,
    'G': 57.02146,
    'H': 137.05891,
    'I': 113.08406,
    'K': 128.09496,
    'L': 113.08406,
    'M': 131.04048,
    'N': 114.04293,
    'O': 132.08988,
    'P': 97.05276,
    'Q': 128.05858,
    'R': 156.10111,
    'S': 87.03203,
    'T': 101.04768,
    'V': 99.06841,
    'W': 186.07931,
    'Y': 163.06333
  }
  // today when I try to fix the problem in my code I find the lorikeet is wrong for the oxidation mass .
  // oxygen is not 15.959..., it is 15.9949... Da
  const proton_mass=1.007276466621; // Da
  const plus57=57.021464; // Da
  aamass['proton']=1.007276466621; // Da;
  aamass['nterm']=0;
  aamass['C[160]']=aamass['C'] + plus57; // Da
  aamass['oxygen']=15.994915; // Da
  aamass['hydrogen']=1.007825035;//1.00784; // Da
  aamass['M[147]']=aamass['M'] + aamass['oxygen'];
  aamass['Q[111]']=aamass['Q'] -17.026549; // Da
  aamass['T[158]']=aamass['T'] + plus57;
  // aamass['n[43]']=41.992724 ; // Da
  aamass['n[43]'] = 42.010565;
  aamass['n[58]']=plus57 ; // Da

  // add several new modifications from uermod
    //   n|+128.094963|Lys
    // n|+43.005814
    // n|+57.021464
    // n|-131.040485|Met-Loss
    // W|+15.994915
    // Y|+15.994915
    // W|+31.989829|Dioxidization
    // S|+79.966331
    // T|+79.966331
    // K|+42.010565

  // n|+128.094963|Lys
  // n|+43.005814
  // n|+57.021464
  // n|-131.040485|Met-Loss
  // W|+15.994915
  // Y|+15.994915
  // W|+31.989829|Dioxidization
  // S|+79.966331
  const phosmass= 79.966331
  aamass['S[167]'] = aamass['S'] +phosmass;
  aamass['T[181]'] = aamass['T'] + phosmass;
  aamass['n[44]'] = 43.005814;
  aamass['K[0]'] = aamass['K'] +42.010565;
  // aamass['n[43]'] = ;//
  // T|+79.966331
  // K|+42.010565



  // parameter session 
//   <enzymatic_search_constraint enzyme="default" min_number_termini="2" max_num_internal_cleavages="2"/>
// <aminoacid_modification aminoacid="C" massdiff="57.0215" mass="160.0307" variable="N"/>
// <aminoacid_modification aminoacid="M" massdiff="15.9949" mass="147.0354" variable="Y"/>
// <terminal_modification massdiff="42.0106" protein_terminus="Y" mass="43.0184" terminus="N" variable="Y"/>
// <terminal_modification massdiff="27.9949" protein_terminus="N" mass="29.0027" terminus="N" variable="Y"/>
// <aminoacid_modification aminoacid="N" massdiff="0.9840" mass="115.0269" variable="Y"/>
// <terminal_modification massdiff="57.0214" protein_terminus="N" mass="58.0292" terminus="N" variable="Y"/>
// <aminoacid_modification aminoacid="T" massdiff="57.0214" mass="158.0691" variable="Y"/>
// <aminoacid_modification aminoacid="W" massdiff="31.9898" mass="218.0691" variable="Y"/>

aamass['n[29]']=27.9949;
aamass['n[86]'] = aamass['n[58]'] + aamass['n[29]'];
aamass['N[115]'] = aamass['N'] + 0.9840;
aamass['W[218]'] = aamass['W'] + 31.9898;// Da

  return aamass;
}

function get2AAMass()
{
  var aamass = {
    'G': 57.02146,
    'A': 71.03711,
    'S': 87.03203,
    'P': 97.05276,
    'V': 99.06841,
    'T': 101.04768,
    'C': 103.00918,
    'L': 113.08406,
    'I': 113.08406,
    'N': 114.04293,
    'D': 115.02694,
    'Q': 128.05858,
    'K': 128.09496,
    'E': 129.04259,
    'M': 131.04048,
    'O': 132.08988,
    'H': 137.05891,
    'F': 147.06841,
    'R': 156.10111,
    'Y': 163.06333,
    'W': 186.07931
  }
  var keys='GASPVTCLINDQKEMOHFRYW'
  var aa2mass={}
  for(var i = 0; i< keys.length-1; i ++)
  {
    for (var j = i; j < keys.length; j ++)
    {
      aa2mass[keys[i]+''+keys[j]]=aamass[keys[i]]+aamass[keys[j]];
    }
  }
  // console.log('aamass', aa2mass);
  return aa2mass;
}

function getvarModsLorikeet(x)
{
  
  var aamass = getAAMass();
  var varMods=[]
  for(var i =0; i < x.modification.length; i++)
  {
    var aa = x.modification[i].AA
    if(aa==="n" || aa === "c")
    {
      console.log("skip it", aa);
    }
    else{
      varMods.push({"index": x.modification[i].index, "aminoAcid": x.modification[i].AA, "modMass": x.modification[i].ptm-aamass[x.modification[i].AA] 
      })
    }
  }
  console.log('debug: varMods ' , varMods,"  on modstring ", x);
  return varMods;
}


function parseModifiedPeptide(modstr)
{
  console.log('the mod string is ', modstr);
  var aamass = getAAMass();
  function isModified(modstr){
    if (modstr.includes("\["))
    {
       return true;
    }
    return false;

  }
  var node={"modification": "UNMODIFIED","Peptide":""}
  // console.log("modstr: ", modstr);
  var nterm=0
  var cterm = 0
  if (isModified(modstr))
  {
    var modifications=[]
    var status_bracket = false;
    
    
    var pepseq = "";
    var str_ptmvalue = "";
    var modAA = "";
     for(var i = 0; i < modstr.length; i ++)
     {
      //  console.log(modstr[i]);
       if(modstr[i]==='[') // left
       {
         str_ptmvalue = "";
         var modidx=i;
        //  console.log("mod foud: ", i-1);
         status_bracket = true;
         modAA = modstr[i-1];
       }
       else if(modstr[i]===']') // right
       {
         status_bracket = false;
         var value=parseFloat(str_ptmvalue);
         if (value == 0){
           value = str_ptmvalue;
         }
         //  value=aamass[`${modAA}[${value}]`];
         //  if(modAA=='N' && value==115){
           //    value = aamass['N[115]'];
           //  }
           var tokenKey=`${modAA}[${value}]`;
           console.log("got ptm: ", str_ptmvalue, "got token key ", tokenKey, "searching in aamas: ", aamass);

         modifications.push({"ptm":aamass[tokenKey], "AA":modAA, "index": pepseq.length});
        //  console.log("so far: ", modifications)
        modAA="";
       }
       else if(status_bracket)
       {
         // got value of PTM
         str_ptmvalue += modstr[i];

       }
       else if(modstr[i]==="n" || modstr[i]==="c"){

       }
       else{
         pepseq+= modstr[i];
       }
       
     }


     var x = modifications.find(x => x.AA==="n");
    //  console.log(x);
     if(x)
     {
       nterm=x.ptm + aamass['proton'];
     }

     var c = modifications.find(x => x.AA==="c");
    //  console.log(c);
     if(c)
     {
       cterm=c.ptm;
     }

    //  console.log("cterm", cterm, "nterm", nterm)
     node.modification=modifications;
     node.Peptide=pepseq;
     node["cterm"]=cterm;
     node["nterm"]=nterm;
    //  console.log("final results", node);
  }
  else{
    node.modification=[];
    node.Peptide=modstr;
    node["cterm"]=cterm;
     node["nterm"]=nterm;
  }
  // console.log( node);
  return node;

}



// function parseModifiedPeptide(modstr)
// {
//   function isModified(modstr){
//     if (modstr.includes("\["))
//     {
//        return true;
//     }
//     return false;

//   }
//   var node={"modification": "UNMODIFIED","Peptide":""}
//   console.log("modstr: ", modstr);
//   if (isModified(modstr))
//   {
//     var modifications=[]
//     var status_bracket = false;
//     var nterm=0
//     var cterm = 0
    
//     var pepseq = "";
//     var str_ptmvalue = "";
//     var modAA = "";
//      for(var i = 0; i < modstr.length; i ++)
//      {
//        console.log(modstr[i]);
       
       
       
//        if(modstr[i]==='[') // left
//        {
//          str_ptmvalue = "";
//          var modidx=i;
//          console.log("mod foud: ", i-1);
//          status_bracket = true;
//          modAA = modstr[i-1];
//        }
//        else if(modstr[i]===']') // right
//        {
//          status_bracket = false;
//          var value=parseFloat(str_ptmvalue);
         
//          modifications.push({"ptm":value, "AA":modAA, "index": pepseq.length});
//          console.log("so far: ", modifications)
//         modAA="";
//        }
//        else if(status_bracket)
//        {
//          // got value of PTM
//          str_ptmvalue += modstr[i];

//        }
//        else if(modstr[i]==="n" || modstr[i]==="c"){

//        }
//        else{
//          pepseq+= modstr[i];
//        }
       
//      }


//      var x = modifications.find(x => x.AA==="n");
//      console.log(x);
//      if(x)
//      {
//        nterm=x.ptm;
//      }

//      var c = modifications.find(x => x.AA==="n");
//      console.log(c);
//      if(c)
//      {
//        cterm=c.ptm;
//      }

//      console.log("cterm", cterm, "nterm", nterm)
//      node.modification=modifications;
//      node.Peptide=pepseq;
//      node["cterm"]=cterm;
//      node["nterm"]=nterm;
//      console.log("final results", node);
//   }
//   else{
//     node.modification="UNMODIFIED";
//   }
//   console.log( node);
//   return node;

// }

function add_naviation_bar_cloud_search()
{
  add_navigation_bar("cloudsearch");

}

function getlaunchtime() {
  var x = $(".page-header").text();
  var platform = "CPU";
  if (x.includes("GPU")) {
    platform = "GPU";
  }
  var launchtime = "";
  var y = x.match(/updated[0-9 A-Za-z\n,)]*/g);
  //console.log(y)
  var z = y[0];
  z = z.split('on ')[1];
  z = z.split(")")[0]
  return z;
}

function add_navigation_bar_cluster_page() {
  add_navigation_bar();
}

function add_navigation_bar_doc_page() {
  add_navigation_bar("documentation");
}

function add_navigation_bar(activeItem="Spectral Cluster") {
  var x = $(".page-header").text();
  var platform = "CPU";
  if (x.includes("GPU")) {
    platform = "GPU";
  }
  var launchtime = getlaunchtime();

  var spectralclusterActive = "";
  var peptidesearchActive = "";
  var filesearchActive="";
  var cloudsearchActive = "";
  var peaklistsearchActive="";
  var documentationActive = "";
  if(activeItem == "Spectral Cluster"){
    spectralclusterActive = "active";
  } else if (activeItem == "peptidesearch"){
    peptidesearchActive = "active";
  }else if (activeItem == "filesearch"){
    filesearchActive = "active";
  } else if (activeItem == "cloudsearch"){
    cloudsearchActive = "active";
  } else if (activeItem == "peaklistsearch"){
    peaklistsearchActive = "active";
  }else if (activeItem == "documentation"){
    documentationActive = "active";
  }


  var totalnum = x.split("from ")[1].split("(")[0]
  var htmlnavstring = String.raw`<nav class="navbar fixed-top  navbar-expand-sm navbar-expand-lg navbar-dark bg-primary " >
  <!-- Navbar content -->
  <!-- <nav class="navbar  navbar-light bg-light"> -->

  <a class="navbar-brand" onclick="feellucky()">Home</a>
  <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarText" aria-controls="navbarText" aria-expanded="false" aria-label="Toggle navigation">
    <span class="navbar-toggler-icon"></span>
  </button>
  <div class="collapse navbar-collapse" id="navbarText">
    <ul class="navbar-nav mr-auto">
      <li class="nav-item ${spectralclusterActive}">
        <a class="nav-link" href="/">Spectral Cluster </a>
      </li>
      <li class="nav-item ${peptidesearchActive}">
        <a class="nav-link" href="/peptidesearch.html">Peptide Search</a>
      </li>
          <li class="nav-item ${filesearchActive}">
          <a class="nav-link" href="/filesearch.html">File Search  </a>
        </li>

       <li class="nav-item ${cloudsearchActive}"> 
        <a class="nav-link" href="/cloudsearch.html" style="display: none;">Cloud Search</a> 
     </li> 

      <li class="nav-item ${peaklistsearchActive}"> 
      <a class="nav-link" href="/peaklistsearch.html" >PeakList Search</a> 
    </li> 

      <li class="nav-item ${documentationActive}">
        <a class="nav-link" href="/documentation.html">Documentation <span class="sr-only">(current)</span></a>
      </li>
    </ul>
    <span class="navbar-text">
       ${totalnum} Spectra | ${platform} | ${launchtime}
    </span>
  </div>

</nav>`

  $("#archive_navigation_bar").html(htmlnavstring);
  // this is how sticky navbar works in bootstrap, not sure why this is not handled by bootstrap js.
  $("body").css("padding-top", $("#archive_navigation_bar > nav")[0].offsetHeight); // add space to prevent navbar covering top content.
  window.addEventListener("resize", () => { // update padding whenever window size is changed.
    $("body").css("padding-top", $("#archive_navigation_bar > nav")[0].offsetHeight);
  });
}
