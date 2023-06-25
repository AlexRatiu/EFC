const express = require("express");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const sass = require("sass");
const ejs = require("ejs");
const { Client } = require("pg");
const formidable=require("formidable");
const {Utilizator}=require("./module_proprii/utilizator.js")
const session=require('express-session');
const Drepturi = require("./module_proprii/drepturi.js");
const AccesBD = require("./module_proprii/accesbd.js");
const { randomInt } = require("crypto");
app = express();
app.set("view engine", "ejs");

obGlobal = {
    obErori: null,
    obImagini: null,
    folderScss: path.join(__dirname, "resurse", "scss"),
    folderCss: path.join(__dirname, "resurse", "css"),
    folderBackup: path.join(__dirname, "resurse/backup"),
    optiuniMeniu:[]
}; 



var client= new Client({database:"EFC",
        user:"alex",
        password:"123456",
        host:"localhost",
        port:5432});
client.connect();
client.query("select * from laborator8", function(err, rez){   
    });

console.log("Folder proiect", __dirname);

console.log("Cale fisier", __filename);
    
console.log("Director de lucru ", process.cwd());



vectorFoldere = ["temp", "temp1", "backup","poze_uploadate"]
for (let folder of vectorFoldere) {
    //let caleFolder =__dirname+"/"+folder;
    let caleFolder = path.join(__dirname, folder)
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder);
    }
}
vFisiere = fs.readdirSync(obGlobal.folderScss);
console.log("fisiere:");
console.log(vFisiere);


app.set("view engine","ejs");
app.set("views","views/");



app.use(
    express.static(__dirname + "/resurse")
);

app.use("/node_modules", express.static(__dirname + "/node_modules"));

app.use("/*", function(req, res, next){
    res.locals.optiuniMeniu = obGlobal.optiuniMeniu;
    next();
})

app.use(/^\/resurse(\/((?=[0-9])|(?=[a-z])|(?=[A-Z])))*$/, function(req,res){
    afiseazaEroare(res,403);
});

app.get(["/","/index","/home",],function(req,res){
    res.render("pagini/home",{ip: req.ip, a: 10, b: 20, imagini:obGlobal.obImagini.imagini});
});

app.get(["/evenimente"],function(req,res){
    res.render("pagini/evenimente",{ip: req.ip, a: 10, b: 20, imagini:obGlobal.obImagini.imagini});
});

app.get("/*.ejs", function (req, res) {

    afiseazaEroare(res, 400);
});

app.get("/favicon.ico", function (req, res) {
    res.sendFile(__dirname + "./resurse/imagini/ico/favicon.ico");
});

app.get("/*", function (req, res) {
    try {
        console.log(req.url);
        res.render("pagini" + req.url, function (err, rezRandare) {
            if (err) {
                if (err.message.startsWith("Failed to lookup view"))
                    afiseazaEroare(res, 404); 
                else
                    afiseazaEroare(res);
            }
            else {
                console.log(rezRandare);
                res.send(rezRandare);
            }
        });
    } catch (err) {
        if (err.message.startsWith("Cannot find module"))
            afiseazaEroare(res, 404, "Fisier resursa negasit");
    }
}); 


function compileazaScss(caleScss, caleCss) {
    if (!caleCss) {
        let numeFisierExt = path.basename(caleScss);
        let numeFis = numeFisierExt.split(".")[0];
        caleCss = numeFis + ".css";
        
    }
    if (!path.isAbsolute(caleScss)) {
        caleScss = path.join(obGlobal.folderScss, caleScss);
    }

    if (!path.isAbsolute(caleCss)) {
        caleCss = path.join(obGlobal.folderCss, caleCss);
    }
    let caleResBackup = path.join(obGlobal.folderBackup);
    if (!fs.existsSync(caleResBackup)) {
        fs.mkdirSync(caleResBackup, { recursive: true });
    }
    let numeFisCss = path.basename(caleCss);
    let data_curenta = new Date();
    let numeBackup =
        numeFisCss.split(".")[0] +
        "_" +
        data_curenta.toDateString().replace(" ", "_") +
        "_" +
        data_curenta.getHours() +
        "_" +
        data_curenta.getMinutes() +
        "_" +
        data_curenta.getSeconds() +
        ".css";

    rez = sass.compile(caleScss, { sourceMap: true });

    fs.writeFileSync(caleCss, rez.css);

}

for (let numeFis of vFisiere) {
    if (path.extname(numeFis) === ".scss") {
        compileazaScss(numeFis);
    }
}

fs.watch(obGlobal.folderScss, function (event, filename) {
    console.log(event, filename);
    if (event === "change" || event === "rename") {
        let caleCompleta = path.join(obGlobal.folderScss, filename);
        if (fs.existsSync(caleCompleta)) {
            compileazaScss(caleCompleta);
        }
    }
});

function initErori() {
    var continut = fs.readFileSync(__dirname + "/resurse/json/erori.json").toString("utf-8"); 
    obGlobal.obErori = JSON.parse(continut);
    let vErori = obGlobal.obErori.info_erori;
    for (let eroare of vErori) { 
        eroare.imagine =  obGlobal.obErori.cale_baza + "/" + eroare.imagine;
    }
}

initErori();


function initImagini() {
    var continut = fs
        .readFileSync(path.join(__dirname, "/resurse/json/galerie.json"))
        .toString("utf-8");
    obGlobal.obImagini = JSON.parse(continut);

    let vImagini = obGlobal.obImagini.imagini;

    let caleAbs = path.join(__dirname, "resurse", obGlobal.obImagini.cale_galerie);
    let caleAbsMediu = path.join(caleAbs, "mediu");
    let caleAbsMic = path.join(caleAbs, "mic");

    if (!fs.existsSync(caleAbsMediu)) {
        fs.mkdirSync(caleAbsMediu);
    }

    if (!fs.existsSync(caleAbsMic)) {
        fs.mkdirSync(caleAbsMic);
    }

    for (let imag of vImagini) {
        [nume_fisier, extensie] = imag.fisier.split(".");

        imag.fisier_mediu =
            "/" +
            path.join(
               "resurse", obGlobal.obImagini.cale_galerie,
                "mediu",
                nume_fisier + "_mediu" + ".webp"
            );
        imag.fisier_mic =
            "/" +
            path.join(
                "resurse", obGlobal.obImagini.cale_galerie,
                "mic",
                nume_fisier + "_mic" + ".webp"
            );

        let caleAbsFisMediu = path.join(__dirname, imag.fisier_mediu);
        let caleAbsFisMic = path.join(__dirname, imag.fisier_mic);

        sharp(path.join(caleAbs, imag.fisier))
            .resize(1000, 1000)
            .toFile(caleAbsFisMediu);
        sharp(path.join(caleAbs, imag.fisier))
            .resize(300, 300)
            .toFile(caleAbsFisMic);

        imag.fisier =
            "/" + path.join(obGlobal.obImagini.cale_galerie, imag.fisier);
    }
}
initImagini();


console.log("Folder proiect", __dirname);

function afiseazaEroare(
    res,
    _identificator,
    _titlu = "titlu default",
    _text = "text default",
    _imagine
) {
    let vErori = obGlobal.obErori.info_erori;
    let eroare = vErori.find(function (element) {
        return element.identificator === _identificator;
    });

    if (eroare) {
        let titlu = (_titlu = "titlu default"
            ? eroare.titlu || _titlu
            : _titlu);
        let text = (_text = "text default" ? eroare.text || _text : _text);
        let imagine = (_imagine = "imagine default"
            ? eroare.imagine || _imagine
            : _imagine);
        if (eroare.status) {
            res.status(eroare.identificator).render("pagini/eroare.ejs", {
                titlu: titlu,
                text: text,
                imagine: imagine,
                optiuni: obGlobal.optiuniMeniu
            });
        } else {
            res.render("pagini/eroare.ejs", {
                titlu: titlu,
                text: text,
                imagine: imagine
            });
        }
    } else {
        let errDef = obGlobal.obErori.eroare_default;
        res.render("pagini/eroare.ejs", {
            titlu: errDef.titlu,
            text: errDef.text,
            imagine: obGlobal.obErori.cale_baza + "/" + errDef.imagine
        });
    }
}

app.get("/galerie", function (req, res) {
    let nrImagini = randomInt(5, 11);
    if (nrImagini % 2 == 0) nrImagini++;

    let imgInv = [...obGlobal.obImagini.imagini].reverse();

    let fisScss = path.join(__dirname, "resurse/scss/galerie_animata.scss");
    let liniiFisScss = fs.readFileSync(fisScss).toString().split("\n");

    let stringImg = "$nrImg: " + nrImagini + ";";

    liniiFisScss = liniiFisScss.slice(1);


    liniiFisScss.unshift(stringImg);


    fs.writeFileSync(fisScss, liniiFisScss.join("\n"));

    res.render("pagini/galerie.ejs", {
        imagini: obGlobal.obImagini.imagini,
        nrImagini: nrImagini,
        imgInv: imgInv
    });
});



app.listen(8080);

console.log("Serverul a pornit");