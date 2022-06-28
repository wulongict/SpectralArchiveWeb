// aminoacid.js tests
test("AminoAcid properties", function() {
    var aaM = AminoAcid.get("M");
    equal(aaM.name, "Methionine");
    equal(aaM.shortName, "Met");
    equal(aaM.mono, 131.040484645);
    equal(aaM.avg, 131.19606);
    equal(aaM.code, "M");
});

test("Invalid AminoAcid", function() {
    var aaInvalid = AminoAcid.get("B");
    equal(aaInvalid.code, "B");
    equal(aaInvalid.shortName, "B");
});

// peptide.js tests
var UNMODIFIED_TEST_PEPTIDE = new Peptide("AGCDE", [], [], 0.0, 0.0);
var SHORT_TEST_PEPTIDE = new Peptide("AR", [], [], 0.0, 0.0);
var SINGLETON_TEST_PEPTIDE = new Peptide("T", [], [], 0.0, 0.0);
var STATIC_TEST_MODIFICATION = new Modification(AminoAcid.get("C"), 57.0);
var STATIC_MODIFIED_PEPTIDE = new Peptide("AGCDE", [STATIC_TEST_MODIFICATION], [], 0.0, 0.0);
var VARIABLE_TEST_MODIFICATION = new VariableModification(3, 57.0, AminoAcid.get("C"));
var VARIABLE_MODFIFIED_PEPTIDE = new Peptide("AGCDE", [], [VARIABLE_TEST_MODIFICATION], 0.0, 0.0);
var TEST_N_TERM_MODIFICATION = 12.0;
var TEST_C_TERM_MODIFICATION = 15.0;
var TERMINAL_MODIFIED_PEPTIDE = new Peptide("AGCDE", [], [], TEST_N_TERM_MODIFICATION, TEST_C_TERM_MODIFICATION);

test("Modification properties", function() {
    equal(STATIC_TEST_MODIFICATION.aa.code,  "C");
    equal(STATIC_TEST_MODIFICATION.modMass, 57.0);
});

test("VariableModification properties", function() {
    equal(VARIABLE_TEST_MODIFICATION.aa.code, "C");
    equal(VARIABLE_TEST_MODIFICATION.position, 3);
    equal(VARIABLE_TEST_MODIFICATION.modMass, 57.0);
}) 

test("getSeqMass for simple peptide", function() {
    var peptide = UNMODIFIED_TEST_PEPTIDE;
    var mass1 = peptide.getSeqMassMono(1, "n");
    equal(mass1, AminoAcid.get("A").mono);
    var mass2 = peptide.getSeqMassAvg(3, "c");
    equal(mass2, AminoAcid.get("D").avg + AminoAcid.get("E").avg);
});

test("getSeqMass for peptide with static modification", function() {
    var peptide = STATIC_MODIFIED_PEPTIDE;
    // subsequence without modification
    var mass1 = peptide.getSeqMassMono(2, "n");
    equal(mass1, AminoAcid.get("A").mono + AminoAcid.get("G").mono);
    // subsequence with modification
    var mass2 = peptide.getSeqMassMono(3, "n");
    equal(mass2, AminoAcid.get("A").mono + AminoAcid.get("G").mono + AminoAcid.get("C").mono + 57.0);
});

test("getSeqMass for peptide with var modification", function() {
    var peptide = VARIABLE_MODFIFIED_PEPTIDE;
    var mass = peptide.getSeqMassAvg(3, "n");
    equal(mass, AminoAcid.get("A").avg + AminoAcid.get("G").avg + AminoAcid.get("C").avg + 57.0);
});

test("getSeqMass for peptide with terminal modfications", function() {
    var peptide = TERMINAL_MODIFIED_PEPTIDE;
    var mass1 = peptide.getSeqMassMono(1, "n");
    equal(mass1, AminoAcid.get("A").mono + TEST_N_TERM_MODIFICATION);
    var mass2 = peptide.getSeqMassAvg(4, "c");
    equal(mass2, AminoAcid.get("E").avg + TEST_C_TERM_MODIFICATION);
});

test("getSeqMass for internal ions", function() {
    var peptide = UNMODIFIED_TEST_PEPTIDE;
    //peptide._getSeqMass()
    var iMass = peptide.getSeqMass(2, 4, "n", "mono");
    console.log(iMass);
    equal(iMass, AminoAcid.get("C").mono + AminoAcid.get("D").mono);
    var iMass2 = peptide.getSeqMass(4, 1, "c", "avg");
    equal(iMass2, AminoAcid.get("G").avg + AminoAcid.get("C").avg + AminoAcid.get("D").avg);
});

test("getNeutralMassMono for peptide with terminal modifications", function() {
    var mass = VARIABLE_MODFIFIED_PEPTIDE.getNeutralMassMono();
    var expectedMass = AminoAcid.get("A").mono +
                       AminoAcid.get("G").mono +
                       AminoAcid.get("C").mono +
                       57.0 +
                       AminoAcid.get("D").mono +
                       AminoAcid.get("E").mono +
                       Ion.MASS_H_1 +
                       Ion.MASS_O_16 + Ion.MASS_H_1;
    equal(mass, expectedMass);
});

test("getNeutralMassAvg for peptide with variable modifications", function() {
    var mass = TERMINAL_MODIFIED_PEPTIDE.getNeutralMassAvg();
    var expectedMass = AminoAcid.get("A").avg +
                       AminoAcid.get("G").avg +
                       AminoAcid.get("C").avg +
                       AminoAcid.get("D").avg +
                       AminoAcid.get("E").avg +
                       TEST_N_TERM_MODIFICATION +
                       TEST_C_TERM_MODIFICATION +
                       Ion.MASS_H +
                       Ion.MASS_O + Ion.MASS_H;
    equal(mass, expectedMass);
});

// ion.js tests
test("Ion properties", function() {
    var bIon = Ion.get("b", 2);
    equal(bIon.charge, 2);
    equal(bIon.type, "b");
    equal(bIon.term, "n");
    equal(bIon.label, "b2+");
});

test("getSeriesIon for b", function() {
    var bIon = Ion.get("b", 3);
    var seriesIonB = Ion.getSeriesIon(bIon, UNMODIFIED_TEST_PEPTIDE, 2, "mono");
    equal(seriesIonB.charge, 3);
    equal(seriesIonB.term, "n");
    var mass = AminoAcid.get("A").mono +
               AminoAcid.get("G").mono;
    var mz = (mass + (3 * Ion.MASS_PROTON) ) / 3;
    equal(seriesIonB.mz, mz);
});

test("getSeriesIon for y", function() {
    var yIon = Ion.get("y", 1);
    var seriesIonY = Ion.getSeriesIon(yIon, UNMODIFIED_TEST_PEPTIDE, 2, "avg");
    equal(seriesIonY.charge, 1);
    equal(seriesIonY.term, "c");
    var mass = AminoAcid.get("C").avg +
               AminoAcid.get("D").avg + 
               AminoAcid.get("E").avg +
               2 * Ion.MASS_H + Ion.MASS_O;
    var mz = (mass + (1 * Ion.MASS_PROTON) ) / 1;
    equal(seriesIonY.mz, mz);
});

test("getSeriesIon for MH", function() {
    // Problems with avg
    // AGCDE
    // 494.5033 -> 494.4958 (charge 1)  D 0.0075
    // 247.7554 -> 247.7516 (charge 2)  D 0.0038

    // AR 
    // 246.2907 -> 246.2859 (chrage 1)  D 0.0048
    // 123.6491 -> 123.6466 (charge 2)  D 0.0025

    // T
    // 120.1285 -> 120.1262 (charge 1) D 0.0023
    // 60.5680 -> 60.5667 (charge 2)   D 0.0013


    var mhIon = Ion.get("mh", 1);
    var seriesIonMH = Ion.getSeriesIon(mhIon, UNMODIFIED_TEST_PEPTIDE, null, "mono");

    // From protein prospector
    equal(seriesIonMH.mz.toFixed(4), 494.1551);

    seriesIonMH = Ion.getSeriesIon(mhIon, UNMODIFIED_TEST_PEPTIDE, null, "avg");
    // From protein prospector
    equal(seriesIonMH.mz.toFixed(4), 494.5033);

    mhIon = Ion.get("mh", 2);
    seriesIonMH = Ion.getSeriesIon(mhIon, UNMODIFIED_TEST_PEPTIDE, null, "mono");

    // From protein prospector
    equal(seriesIonMH.mz.toFixed(4), 247.5812);

    seriesIonMH = Ion.getSeriesIon(mhIon, UNMODIFIED_TEST_PEPTIDE, null, "avg");
    // From protein prospector
    equal(seriesIonMH.mz.toFixed(4), 247.7554);

    // TEST SHORTER PEPTIDE
    mhIon = Ion.get("mh", 1);
    seriesIonMH = Ion.getSeriesIon(mhIon, SHORT_TEST_PEPTIDE, null, "avg");
    // From protein prospector
    equal(seriesIonMH.mz.toFixed(4), 246.2907);

    mhIon = Ion.get("mh", 2);
    seriesIonMH = Ion.getSeriesIon(mhIon, SHORT_TEST_PEPTIDE, null, "avg");
    // From protein prospector
    equal(seriesIonMH.mz.toFixed(4), 123.6491);


    // TEST SHORTER PEPTIDE
    mhIon = Ion.get("mh", 1);
    seriesIonMH = Ion.getSeriesIon(mhIon, SINGLETON_TEST_PEPTIDE, null, "avg");
    // From protein prospector
    equal(seriesIonMH.mz.toFixed(4), 120.1285);

    mhIon = Ion.get("mh", 2);
    seriesIonMH = Ion.getSeriesIon(mhIon, SINGLETON_TEST_PEPTIDE, null, "avg");
    // From protein prospector
    equal(seriesIonMH.mz.toFixed(4), 60.5680);

});


test("getWaterLossMz", function() {
    function example() {
        this.mz = 100.0;
        this.charge = 2;
        return this;
    }
    var neutralMass = (100.0 * 2) - (2 * Ion.MASS_PROTON);
    var mass = neutralMass - (Ion.MASS_H * 2 + Ion.MASS_O);
    var expectedMz = (mass + (2 * Ion.MASS_PROTON)) / 2;
    equal(Ion.getWaterLossMz(example()), expectedMz); 
});

test("getAmmoniaLossMz", function() {
    function example() {
        this.mz = 50.0;
        this.charge = 3;
        return this;
    }
    var neutralMass = (50.0 * 3) - (3 * Ion.MASS_PROTON);
    var mass = neutralMass - (Ion.MASS_H * 3 + Ion.MASS_N);
    var expectedMz = (mass + (3 * Ion.MASS_PROTON)) / 3;
    equal(Ion.getAmmoniaLossMz(example()), expectedMz); 
});

// internal.js
test("InternalIon labels", function() {
    var peptide = STATIC_MODIFIED_PEPTIDE;
    var i1 = new InternalIon(peptide, 0, 2, "mono");
    equal(i1.label, "AG");
    var i2 = new InternalIon(peptide, 0, 3, "mono");
    equal(i2.label, "AGC(57)");
});

test("InternalIon mz", function() {
    var i1 = new InternalIon(UNMODIFIED_TEST_PEPTIDE, 1, 3, "mono");
    equal(i1.mz, AminoAcid.get("G").mono + AminoAcid.get("C").mono + Ion.MASS_PROTON);
    var i2 = new InternalIon(STATIC_MODIFIED_PEPTIDE, 2, 4, "avg");
    equal(i2.mz, AminoAcid.get("C").avg + 57.0 + AminoAcid.get("D").avg + Ion.MASS_PROTON);
});

test("getInternalIons", function() {
    var simplePeptide = new Peptide("XAAAX", [], [], 0.0, 0.0);
    var internalIons1 = getInternalIons(simplePeptide, "mono");
    equal(2, internalIons1.length);
    equal(internalIons1[0].label, "AA");
    equal(internalIons1[1].label, "AAA");
});

