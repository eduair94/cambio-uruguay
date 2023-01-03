import geocoder from "geocoder";
geocoder.selectProvider("geonames", { username: "EduAir", pass: "j?NjL&5DQ?pcyf5$" });
geocoder.geocode("Atlanta, GA", function (err, data) {
  console.log(err, data);
});
