function getlaunchtime()
{
    var x=$(".page-header").text();
    var platform="CPU";
    if(x.includes("GPU"))
    {
        platform = "GPU";
    }
    var launchtime="";
    var y=x.match(/updated[0-9 A-Za-z\n,)]*/g);
    //console.log(y)
    var z= y[0];
    z=z.split('on ')[1];
    z=z.split(")")[0]
    return z;
}
test("get launchtime", function() {
    equal(1,1);
    var launchtime = getlaunchtime();
    equal(launchtime, "August 14, 2018");
    var mycolor="#000000";

    var z=getContrastColor(mycolor);
    equal(z,"#FFFFFF");
    // equal(z,"#000000");

    // var peptide = TERMINAL_MODIFIED_PEPTIDE;
    // var mass1 = peptide.getSeqMassMono(1, "n");
    // equal(mass1, AminoAcid.get("A").mono + TEST_N_TERM_MODIFICATION);
    // var mass2 = peptide.getSeqMassAvg(4, "c");
    // equal(mass2, AminoAcid.get("E").avg + TEST_C_TERM_MODIFICATION);
});