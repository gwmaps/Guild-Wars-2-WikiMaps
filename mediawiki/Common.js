/**
 * Additions in MediaWiki:Common.js
 */

jQuery(document).ready(function(){
	if($(".gw2map").length){
		$.each([
			"http://cdn.leafletjs.com/leaflet-0.6.4/leaflet.css",
//			"http://cdn.leafletjs.com/leaflet-0.6.4/leaflet-ie.css",
			"https://d1h9a8s8eodvjz.cloudfront.net/fonts/menomonia/08-02-12/menomonia.css",
			"https://d1h9a8s8eodvjz.cloudfront.net/fonts/menomonia/08-02-12/menomonia-italic.css"
		], function(){
			// You may add a browsercheck and also include leaflet-ie.css here if needed
			var ref = document.createElement("link");
			ref.setAttribute("rel", "stylesheet");
			ref.setAttribute("href", this);
			document.getElementsByTagName("head")[0].appendChild(ref);
		});
		// The leaflet CDN does not yet provide SSL, so if the GW2 wikis finally switch to SSL, you'll need to store leaflet somewhere local
		$.ajax("http://cdn.leafletjs.com/leaflet-0.6.4/leaflet.js", {cache:true, dataType:"script"}).done(function(){
			// You'll need to change the link to the actual URL where the widget's JS is stored.
			// For easy maintenance it's a good idea to store it somewhere in the Widget namespace.
			// You can find the latest (minified) versions including polyline decorator and the PhpJS excerpts on the german GW2 wiki:
			// http://wiki-de.guildwars2.com/index.php?title=Widget:Karte/JS&action=raw&ctype=text/javascript
			$.ajax("../js/gw2wikimaps.min.js", {cache:true, dataType:"script"}).done(function(){
				$(".gw2map").each(function(){
					GW2Maps.init(this);
				});
			});
		});
	}
});