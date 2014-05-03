/**
 * Awesome wiki maps by Smiley
 *
 * based on Cliff's example
 * http://jsfiddle.net/cliff/CRRGC/
 *
 * and Dr. Ishmaels proof of concept
 * https://wiki.guildwars2.com/wiki/User:Dr_ishmael/leaflet
 *
 * included in this file:
 *
 * (minified) excerpts from phpJS
 * http://phpjs.org
 *
 * Leaflet polyline decorator
 * https://github.com/bbecquet/Leaflet.PolylineDecorator
 *(c) 2013 Benjamin Becquet
 *
 */

var GW2Maps = {
	/**
	 * @param container
	 * @returns object|bool
	 */
	init: function(container){
		if(typeof container !== "object"){
			return false;
		}
		var options = GW2Maps.options(container),
			mapobject = {
				map: L.map(container, {
					minZoom: 0,
					maxZoom: options.max_zoom,
					crs: L.CRS.Simple,
					zoomControl: options.map_controls,
					attributionControl: false
				}),
				layers: {},
				linkbox: $('<div class="linkbox" style="width: '+options.linkbox+'; height: '+options.height+';" />')
			};

		// first lets prepare our container
		if(options.linkbox){
			// oh, we want a list containing a list of points - no problem! we'll wrap the map container with a table like construct.
			var uni = Math.random().toString().replace(/\./, ""), // we need a unique container id in case we display more than one map
				row = '<div class="table-row" style="width:'+options.width+'" />',
				map_cell = '<div id="c-'+uni+'" class="table-cell" style="width:100%;" />',
				list_cell = '<div class="table-cell" />';
			$(container).css({"width": "100%", "height": options.height}).wrap(row).wrap(map_cell);
			mapobject.linkbox.insertAfter("#c-"+uni+"").wrap(list_cell);
		}
		else{
			// just set the map container to the given size
			$(container).css({"width": options.width, "height": options.height});
		}

		// set the base tiles and add a little copyright info
		L.tileLayer("https://tiles.guildwars2.com/{continent_id}/{floor_id}/{z}/{x}/{y}.jpg", {
			errorTileUrl: options.i18n.errortile,
			minZoom: 0,
			maxZoom: options.max_zoom,
			continuousWorld: true,
			continent_id: options.continent_id,
			floor_id: options.floor_id,
			attribution: options.i18n.attribution+': <a href="https://forum-en.guildwars2.com/forum/community/api/API-Documentation" target="_blank">GW2 Maps API</a>, &copy;<a href="http://www.arena.net/" target="_blank">ArenaNet</a>'
		}).addTo(mapobject.map);

		// add layergroups and show them on the map
		// TODO add flags to include/exclude layers from the view, add map names
		mapobject.layers[options.i18n.event] = L.layerGroup();
		mapobject.layers[options.i18n.landmark] = L.layerGroup();
		mapobject.layers[options.i18n.markers] = L.layerGroup();
		mapobject.layers[options.i18n.polylines] = L.layerGroup();
		mapobject.layers[options.i18n.skill] = L.layerGroup();
		mapobject.layers[options.i18n.task] = L.layerGroup();
		mapobject.layers[options.i18n.vista] = L.layerGroup();
		mapobject.layers[options.i18n.waypoint] = L.layerGroup();
		mapobject.layers[options.i18n.sector] = L.layerGroup();

		// showing all the stuff on the initial map would be confusing in most cases,
		// so we'll show it automatically only on higher zoom levels - it's in the layer menu anyway
		if(mapobject.map.getZoom() > 2){
			mapobject.layers[options.i18n.marker].addTo(mapobject.map);
		}
		if(mapobject.map.getZoom() > 3){
			mapobject.layers[options.i18n.landmark].addTo(mapobject.map);
			mapobject.layers[options.i18n.skill].addTo(mapobject.map);
			mapobject.layers[options.i18n.vista].addTo(mapobject.map);
			mapobject.layers[options.i18n.waypoint].addTo(mapobject.map);
		}
		if(mapobject.map.getZoom() > 4){
			mapobject.layers[options.i18n.polylines].addTo(mapobject.map);
			mapobject.layers[options.i18n.task].addTo(mapobject.map);
		}
		if(options.region_id && options.map_id || mapobject.map.getZoom() > 5){
			mapobject.layers[options.i18n.sector].addTo(mapobject.map);
			mapobject.layers[options.i18n.event].addTo(mapobject.map);
		}

		// a Layer control if wanted
		if(options.map_controls){
			L.control.layers(null, mapobject.layers).addTo(mapobject.map);
		}

		// we have polylines to display?
		if(options.polyline && options.polyline.length > 7){
			GW2Maps.parse_polylines(mapobject, options);
		}

		// oh, also markers!?
		if(options.markers && options.markers.length > 2){
			GW2Maps.parse_markers(mapobject, options);
		}

		// magically display/remove icons
		// the checkbox in the layer menu will not update - bug?
		mapobject.map.on("zoomend", function(){
			var z = mapobject.map.getZoom();
			z > 5 ? mapobject.layers[options.i18n.event].addTo(mapobject.map) : mapobject.map.removeLayer(mapobject.layers[options.i18n.event]);
			z > 5 ? mapobject.layers[options.i18n.sector].addTo(mapobject.map) : mapobject.map.removeLayer(mapobject.layers[options.i18n.sector]);
			z > 4 ? mapobject.layers[options.i18n.polylines].addTo(mapobject.map) : mapobject.map.removeLayer(mapobject.layers[options.i18n.polylines]);
			z > 4 ? mapobject.layers[options.i18n.task].addTo(mapobject.map) : mapobject.map.removeLayer(mapobject.layers[options.i18n.task]);
			z > 3 ? mapobject.layers[options.i18n.landmark].addTo(mapobject.map) : mapobject.map.removeLayer(mapobject.layers[options.i18n.landmark]);
			z > 3 ? mapobject.layers[options.i18n.skill].addTo(mapobject.map) : mapobject.map.removeLayer(mapobject.layers[options.i18n.skill]);
			z > 3 ? mapobject.layers[options.i18n.vista].addTo(mapobject.map) : mapobject.map.removeLayer(mapobject.layers[options.i18n.vista]);
			z > 3 ? mapobject.layers[options.i18n.waypoint].addTo(mapobject.map) : mapobject.map.removeLayer(mapobject.layers[options.i18n.waypoint]);
			z > 2 ? mapobject.layers[options.i18n.markers].addTo(mapobject.map) : mapobject.map.removeLayer(mapobject.layers[options.i18n.markers]);
		});

		// you may specify more mapevent handlers over here - for example a click handler to annoy people ;)
		mapobject.map.on("click", function(event){
//			L.popup().setLatLng(event.latlng).setContent(mapobject.map.project(event.latlng, options.max_zoom).toString()).openOn(mapobject.map);
			console.log(mapobject.map.project(event.latlng, options.max_zoom).toString());
		});

		// get the JSON and start the action ($.getJSON turned out to be pretty unstable...)
		$.ajax({url: "https://api.guildwars2.com/v1/map_floor.json?continent_id="+options.continent_id+"&floor="+options.floor_id+"&lang="+options.i18n.lang, dataType: "json", success: function(floordata){
			if(options.event_data){
				$.ajax({url: "https://api.guildwars2.com/v1/event_details.json?lang="+options.i18n.lang, dataType: "json", success: function(event_response){//async: false,
					// get that event_details.json sorted by map
					var eventdata = {};
					$.each(event_response.events, function(i,e){
						if(typeof eventdata[e.map_id] === "undefined"){
							eventdata[e.map_id] = {};
						}
						eventdata[e.map_id][i] = e;
					});
					GW2Maps.parse_response(mapobject, options, floordata, eventdata);
				}});
			}
			else{
				GW2Maps.parse_response(mapobject, options, floordata, false);
			}
		}}).fail(function(){
			// if we don't get any floordata, we try at least to render the map
			options.region_id = false;
			GW2Maps.parse_response(mapobject, options, {texture_dims: options.continent_id === 1 ? [32768,32768] : [16384,16384], regions:[]}, {});
		});

		// return the mapobject for later use
		return mapobject;
	},

	/**
	 * @param mapobject
	 * @param options
	 * @param floordata
	 * @param eventdata
	 */
	parse_response: function(mapobject, options, floordata, eventdata){
		var bounds, clamp, ev,
			p2ll = function(coords){
				return mapobject.map.unproject(coords, options.max_zoom);
			};
		// the map has a clamped view? ok, we use this as bound
		if(floordata.clamped_view){
			clamp = floordata.clamped_view;
			bounds = new L.LatLngBounds(p2ll([clamp[0][0], clamp[1][1]]), p2ll([clamp[1][0], clamp[0][1]])).pad(0.2);
		}
		// we display a specific map? so lets use the maps bounds
		else if(options.region_id && options.map_id){
			clamp = floordata.regions[options.region_id].maps[options.map_id].continent_rect;
			bounds = new L.LatLngBounds(p2ll([clamp[0][0], clamp[1][1]]), p2ll([clamp[1][0], clamp[0][1]])).pad(0.4);
		}
		// else use the texture_dims as bounds
		else{
//			bounds = new L.LatLngBounds(p2ll([0, (1 << options.max_zoom)*256]), p2ll([(1 << options.max_zoom)*256, 0]));
			bounds = new L.LatLngBounds(p2ll([0, floordata.texture_dims[1]]), p2ll([floordata.texture_dims[0], 0])).pad(0.1);
		}
		mapobject.map.setMaxBounds(bounds).fitBounds(bounds);

		// ok, we want to display a single map
		if(options.region_id && options.map_id){
			ev = typeof eventdata[options.map_id] !== "undefined" ? eventdata[options.map_id] : false;
			GW2Maps.parse_map(mapobject, options, floordata.regions[options.region_id].maps[options.map_id], ev);
		}
		// else render anything we get
		else{
			$.each(floordata.regions, function(){
				$.each(this.maps, function(i){ // the first time where index as first param makes sense - thanks jquery... not.
					GW2Maps.parse_map(mapobject, options, this, typeof eventdata[i] !== "undefined" ? eventdata[i] : false);
				});
			});
		}
	},

	/**
	 * the no more so ugly map parser of uglyness (Anet, please get your data straight!)
	 *
	 * @param mapobject
	 * @param options
	 * @param map
	 * @param eventdata
	 */
	parse_map: function(mapobject, options, map, eventdata){
		var pois = {task: [], event: [], landmark: [], skill: [], vista: [], waypoint: [], sector: []},
			sort = {task: [], event: [], landmark: [], skill: [], vista: [], waypoint: [], sector: []},
			recalc_event_coords = function(cr, mr, p){
				// don't look at it. really! it will melt your brain and make your eyes bleed!
				return [(cr[0][0]+(cr[1][0]-cr[0][0])*(p[0]-mr[0][0])/(mr[1][0]-mr[0][0])),(cr[0][1]+(cr[1][1]-cr[0][1])*(1-(p[1]-mr [0][1])/(mr[1][1]-mr[0][1])))]
			};
		// pois
		$.each(map.points_of_interest, function(){
			if(this.type == "waypoint"){
				sort.waypoint.push(this.name);
				pois.waypoint.push({
					id: this.poi_id,
					type: this.type,
					coords: this.coord,
					title: this.name,
					text: this.name,
					popup: this.name+"<br />id:"+this.poi_id
				});
			}
			if(this.type == "landmark"){
				sort.landmark.push(this.name);
				pois.landmark.push({
					id: this.poi_id,
					type: this.type,
					coords: this.coord,
					title: this.name,
					text: this.name,
					popup: '<a href="'+options.i18n.wiki+encodeURIComponent(this.name)+'" target="_blank">'+this.name+"</a><br />id:"+this.poi_id
				});
			}
			if(this.type == "vista"){
				sort.vista.push(this.poi_id);
				pois.vista.push({
					type: this.type,
					coords:this.coord,
					title: "id:"+this.poi_id,
					text: this.name+' '+this.poi_id,
					popup: "id:"+this.poi_id
				});
			}
		});
		// tasks (hearts)
		$.each(map.tasks, function(){
			sort.task.push(this.level);
			pois.task.push({
				id: this.task_id,
				type: "task",
				coords: this.coord,
				title: this.objective+" ("+this.level+")",
				text: "("+this.level+") "+this.objective,
				popup: '<a href="'+options.i18n.wiki+encodeURIComponent(this.objective.replace(/\.$/, ""))+'" target="_blank">'+this.objective+"</a> ("+this.level+")<br />id:"+this.task_id
			});
		});
		// skill challenges
		$.each(map.skill_challenges, function(){
			sort.skill.push(this.coord.toString());
			pois.skill.push({
				id: null,
				type: "skill",
				coords: this.coord,
				title: this.coord.toString(),
				text: this.name+' '+this.coord.toString(),
				popup: this.name+' '+this.coord.toString()
			});
		});
		// sector names
		$.each(map.sectors, function(){
			sort.sector.push(this.name);
			pois.sector.push({
				id:this.sector_id,
				type: "sector",
				coords:this.coord,
				title: this.name+", id:"+this.sector_id,
				icon_text: this.name,
				icon_text_class: "sector_text",
				text: this.name,
				popup: '<a href="'+options.i18n.wiki+encodeURIComponent(this.name)+'" target="_blank">'+this.name+"</a><br />id:"+this.sector_id
			});
		});
		// events
		if(eventdata){
			$.each(eventdata, function(i){
				sort.event.push(this.level);
				pois.event.push({
					id:i,
					type: "event",
					coords: recalc_event_coords(map.continent_rect,map.map_rect,this.location.center),
					title: this.name+" ("+this.level+")",
					text: "("+this.level+") "+this.name,
					popup: '<a href="'+options.i18n.wiki+encodeURIComponent(this.name.replace(/\.$/, ""))+'" target="_blank">'+this.name+"</a> ("+this.level+")<br />id:"+i
				});
			});
		}

		// loop out the map points
		if(options.linkbox){
			mapobject.linkbox.append('<div class="header">'+map.name+'</div>');
		}
		$.each(pois, function(i,points){
			// phpJS... <3
			phpjs.array_multisort(sort[i], "SORT_ASC", points);
			if(points.length > 0){
				if(options.linkbox){
					mapobject.linkbox.append('<div class="header sub">'+options.i18n[i]+'</div>');
				}
				$.each(points, function(){
					GW2Maps.parse_point(mapobject, options, this);
				});
			}
		});
	},

	/**
	 * @param mapobject
	 * @param options
	 * @param point
	 */
	parse_point: function(mapobject, options, point){
		var pan = function(event){
				var ll = mapobject.map.unproject(event.data.coords, options.max_zoom);
				mapobject.map.panTo(ll);
				if(event.data.text){
					L.popup({offset:new L.Point(0,-5)}).setLatLng(ll).setContent(event.data.text).openOn(mapobject.map);
				}
			},
			icon = options.i18n["icon_"+point.type],
			icn;

		if(point.type === "sector"){
			icn = L.divIcon({iconSize: [300,30] ,className: point.icon_text_class, html: point.icon_text});
		}
		else if(point.type === "event"){
			//...
			icn = L.icon({iconUrl: icon.link, iconSize: icon.size, popupAnchor:[0, -icon.size[1]/2]});
		}
		else{
			icn = L.icon({iconUrl: icon.link, iconSize: icon.size, popupAnchor:[0, -icon.size[1]/2]});
		}

		var marker = L.marker(mapobject.map.unproject(point.coords, options.max_zoom), {title: point.title, icon: icn});

		if(point.popup){
			marker.bindPopup(point.popup);
		}
		mapobject.layers[options.i18n[point.type]].addLayer(marker);
		if(options.linkbox){
			mapobject.linkbox.append($('<div>'+(icon ? '<img src="'+icon.link+'" style="width:16px; height:16px" />' : '')+' '+point.text+'</div>')
				.on("click", null, {coords: point.coords, text: point.popup}, pan));
		}
		// we have also a poi? lets find and display it...
		if(options.poi_id && point.id === options.poi_id && options.poi_type && point.type === options.poi_type){
			pan({data: {coords: point.coords, text: point.popup}});
			mapobject.map.setZoom(options.max_zoom);
		}
	},

	/**
	 * @param mapobject
	 * @param options
	 */
	parse_polylines: function(mapobject, options){
		var lines = options.polyline.split(";");
		$.each(lines, function(){
			var coords = this.split(" "), line = [], opts = {};
			$.each(coords, function(i, c){
				if(c.match(/\d{1,5},\d{1,5}/)){
					var point = c.split(",");
					line.push(mapobject.map.unproject(point, options.max_zoom));
				}
				if(c.match(/(color|width|opacity|style|type)=(([0-9a-f]{3}){1,2}|\d{1,3}|(arrow|marker|dash))/i)){
					var opt = c.toLowerCase().split("=");
					opts[opt[0]] = opt[1];
				}
			});
			var color = typeof opts.color !== "undefined" ? "#"+opts.color : "#ffe500",
				width = typeof opts.width !== "undefined" ? phpjs.intval(opts.width) : 3,
				opacity = typeof opts.opacity !== "undefined" ? phpjs.intval(opts.opacity)/100 : 0.8,
				dash = opts.style === "dash"  ? "30,15,10,15" : "";

			line = L.polyline(line, {color: color, weight: width, opacity: opacity, dashArray: dash});
			mapobject.layers[options.i18n.polylines].addLayer(line);

			if(typeof opts.type !== "undefined"){
				var patterns = [];
				if(opts.type === "arrow"){
					patterns.push({offset: 50, repeat: "150px", symbol: new L.Symbol.ArrowHead({pixelSize: 15, polygon: false, pathOptions: {stroke: true, color: color, weight: width, opacity: opacity}})});
				}
				if(opts.type === "marker"){
					patterns.push({offset: 0, repeat: "100%", symbol: new L.Symbol.Marker()});
				}
				mapobject.layers[options.i18n.polylines].addLayer(L.polylineDecorator(line, {patterns: patterns}));
			}
		});
	},

	/**
	 * @param mapobject
	 * @param options
	 */
	parse_markers: function(mapobject, options){
		var groups = options.markers.split(";");
		$.each(groups, function(){
			// TODO add custom marker icons
			var coords = this.split(" ");
				$.each(coords, function(i, c){
					if(c.match(/\d{1,5},\d{1,5}/)){
						var point = c.split(","),
							marker = L.marker(mapobject.map.unproject(point, options.max_zoom)).addTo(mapobject.map);

						mapobject.layers[options.i18n.markers].addLayer(marker);
					}
				});

		});
	},

	/**
	 * dataset {
	 *     language: int (1=de, 2=en, 3=es, 4=fr),
	 *     continent_id: (1=Tyria ,2=The Mists),
	 *     floor_id: int,
	 *     region_id: non negative int,
	 *     map_id: non negative int,
	 *     poi_id: non negative int,
	 *     poi_type: int (1=landmark, 2=sector, 3=skill, 4=task, 5=vista, 6=waypoint),
	 *     disable_controls: bool,
	 *     disable_eventdata: bool,
	 *     width: non negative int,
	 *     w_percent: bool,
	 *     height: non negative int,
	 *     h_percent: bool,
	 *     linkbox: non negative int >= 100,
	 *     polyline: comma and space seperated number pairs,
	 *     marker: comma and space seperated number pairs,
	 * }
	 *
	 * @param container
	 * @returns object
	 */
	options: function(container){
		// make sure that any dataset values are number - for wiki security reasons
		// (using filter type integer in the widget.txt extension)
		// exception: the polylines and markers will be a string of comma and space seperated number pairs
		// like: 16661,16788 17514,15935...
		// using preg_replace("#[^,;=\-\d\s\w]#", "", $str), so we need to check for valid pairs
		// i don't bother reading the elements dataset for compatibility reasons
		var dataset = {};
		$.each(container.attributes, function(){
			if(this.name.match(/^data-/)){
				dataset[jQuery.camelCase(this.name.substr(5))] = (this.name === "data-polyline" || this.name === "data-markers") ? this.value : phpjs.intval(this.value);
			}
		});

		// check the option values and fall back to defaults if needed
		var lang = ["en","de","en","es","fr"], // 0 is the default language, change to suit your needs
			poi_types = [false, "landmark", "sector", "skill", "task", "vista", "waypoint"],
			continent_id = typeof dataset.continent_id === "number" && dataset.continent_id >=1 && dataset.continent_id <= 2 ? dataset.continent_id : 1;

		return {
			max_zoom: continent_id == 1 ? 7 : 6,
			continent_id: continent_id,
			floor_id: typeof dataset.floor_id === "number" ? dataset.floor_id : 2,
			region_id: typeof dataset.region_id === "number" && dataset.region_id > 0 ? dataset.region_id : false,
			map_id: typeof dataset.map_id === "number" && dataset.map_id > 0 ? dataset.map_id : false,
			poi_id: typeof dataset.poi_id === "number" && dataset.poi_id > 0 ? dataset.poi_id : false,
			poi_type: typeof dataset.poi_type === "number" && dataset.poi_type > 0 && dataset.poi_type <= 6 ? poi_types[dataset.poi_type] : false,
			width: typeof dataset.width === "number" && dataset.width > 0 ? dataset.width+(dataset.w_percent == true ? "%" : "px") : "800px",
			height: typeof dataset.height === "number" && dataset.height > 0 ? dataset.height+(dataset.h_percent == true ? "%" : "px") : "450px",
			map_controls: dataset.disable_controls != true,
			event_data: dataset.disable_eventdata != true,
			linkbox: typeof dataset.linkbox === "number" && dataset.linkbox >= 100 ? dataset.linkbox+"px" : false,
			polyline: dataset.polyline && dataset.polyline.length > 7 ? dataset.polyline : false,
			markers: dataset.markers && dataset.markers.length > 2 ? dataset.markers : false,
			i18n: typeof dataset.language === "number" && dataset.language >=1 && dataset.language <= 4 ? GW2Maps.i18n[lang[dataset.language]] : GW2Maps.i18n[lang[0]]
		};
	},

	/**
	 * The language strings
	 */
	i18n: {
		de: {
			lang: "de",
			wiki: "//wiki-de.guildwars2.com/wiki/",
			icon_event: {link: "//wiki-de.guildwars2.com/images/7/7a/Event_Angriff_Icon.png", size: [24,24]},
			icon_landmark: {link: "//wiki-de.guildwars2.com/images/0/0f/Sehenswürdigkeit_Icon.png", size: [16,16]},
			icon_skill: {link: "//wiki-de.guildwars2.com/images/c/c3/Fertigkeitspunkt_Icon.png", size: [20,20]},
			icon_task: {link: "//wiki-de.guildwars2.com/images/b/b7/Aufgabe_Icon.png", size: [20,20]},
			icon_vista: {link: "//wiki-de.guildwars2.com/images/9/9f/Aussichtspunkt_Icon.png", size: [20,20]},
			icon_waypoint: {link: "//wiki-de.guildwars2.com/images/d/df/Wegmarke_Icon.png", size: [24,24]},
			errortile: "//wiki-de.guildwars2.com/images/6/6f/Kartenhintergrund.png",
			event: "Events",
			landmark: "Sehenswürdigkeiten",
			markers: "Marker",
			polylines: "Polylinien",
			sector: "Zonen",
			skill: "Fertigkeitspunkte",
			task: "Aufgaben",
			vista: "Aussichtspunkte",
			waypoint: "Wegpunkte",
			attribution: "Kartendaten und -bilder"
		},
		en: {
			lang: "en",
			wiki: "//wiki.guildwars2.com/wiki/",
			icon_event: {link: "//wiki-de.guildwars2.com/images/7/7a/Event_Angriff_Icon.png", size: [24,24]},
			icon_landmark: {link: "//wiki.guildwars2.com/images/f/fb/Point_of_interest.png", size: [20,20]},
			icon_skill: {link: "//wiki.guildwars2.com/images/8/84/Skill_point.png", size: [20,20]},
			icon_task: {link: "//wiki.guildwars2.com/images/f/f8/Complete_heart_(map_icon).png", size: [20,20]},
			icon_vista: {link: "//wiki.guildwars2.com/images/d/d9/Vista.png", size: [20,20]},
			icon_waypoint: {link: "//wiki.guildwars2.com/images/d/d2/Waypoint_(map_icon).png", size: [20,20]},
			errortile: "//wiki-de.guildwars2.com/images/6/6f/Kartenhintergrund.png",
			event: "Events",
			landmark: "Points of Interest",
			markers: "Markers",
			polylines: "Polylines",
			sector: "Sector Names",
			skill: "Skill Challenges",
			task: "Tasks",
			vista: "Vistas",
			waypoint: "Waypoints",
			attribution: "Map data and imagery"
		},
		// TODO add es & fr language snippets, es icons
		es: {
			lang:"es",
			wiki: "//wiki-es.guildwars2.com/wiki/",
			icon_event: {link: "//wiki-de.guildwars2.com/images/7/7a/Event_Angriff_Icon.png", size: [24,24]},
			icon_landmark: {link: "//wiki.guildwars2.com/images/f/fb/Point_of_interest.png", size: [20,20]},
			icon_skill: {link: "//wiki.guildwars2.com/images/8/84/Skill_point.png", size: [20,20]},
			icon_task: {link: "//wiki.guildwars2.com/images/f/f8/Complete_heart_(map_icon).png", size: [20,20]},
			icon_vista: {link: "//wiki.guildwars2.com/images/d/d9/Vista.png", size: [20,20]},
			icon_waypoint: {link: "//wiki.guildwars2.com/images/d/d2/Waypoint_(map_icon).png", size: [20,20]},
			errortile: "//wiki-de.guildwars2.com/images/6/6f/Kartenhintergrund.png",
			event: "event-es",
			landmark: "poi-es",
			markers: "markers-es",
			polylines: "polyline-es",
			sector: "sector-es",
			skill: "skill-es",
			task: "task-es",
			vista: "vista-es",
			waypoint: "waypoint-es",
			attribution: "attribution-es"
		},
		fr: {
			lang: "fr",
			wiki: "//wiki-fr.guildwars2.com/wiki/",
			icon_event: {link: "//wiki-de.guildwars2.com/images/7/7a/Event_Angriff_Icon.png", size: [24,24]},
			icon_landmark: {link: "//wiki-fr.guildwars2.com/images/d/d2/Icône_site_remarquable_découvert.png", size: [20,20]},
			icon_skill: {link: "//wiki-fr.guildwars2.com/images/5/5c/Progression_défi.png", size: [20,20]},
			icon_task: {link: "//wiki-fr.guildwars2.com/images/a/af/Icône_coeur_plein.png", size: [20,20]},
			icon_vista: {link: "//wiki-fr.guildwars2.com/images/8/82/Icône_panorama.png", size: [20,20]},
			icon_waypoint: {link: "//wiki-fr.guildwars2.com/images/5/56/Progression_passage.png", size: [20,20]},
			errortile: "//wiki-de.guildwars2.com/images/6/6f/Kartenhintergrund.png",
			event: "event-fr",
			landmark: "Sites remarquables",
			markers: "markers-fr",
			polylines: "polyline-fr",
			sector: "Secteurs",
			skill: "Défis de compétences",
			task: "Cœurs",
			vista: "Panoramas",
			waypoint: "Points de passage",
			attribution: "attribution-fr"
		}
	}
};


/**
 * excerpts from phpJS in an extra namespace
 * http://phpjs.org
 */

var phpjs = {
	intval: function(mixed_var, base){
		var tmp,
			type = typeof(mixed_var);

		if(type === 'boolean'){
			return +mixed_var;
		}
		else if(type === 'string'){
			tmp = parseInt(mixed_var, base || 10);
			return (isNaN(tmp) || !isFinite(tmp)) ? 0 : tmp;
		}
		else if(type === 'number' && isFinite(mixed_var)){
			return mixed_var|0;
		}
		else{
			return 0;
		}
	},
	parse_url: function(str, component){
		var query, key = ['source', 'scheme', 'authority', 'userInfo', 'user', 'pass', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'fragment'],
			ini = (this.php_js && this.php_js.ini) || {},
			mode = (ini['phpjs.parse_url.mode'] && ini['phpjs.parse_url.mode'].local_value) || 'php',
			parser = {
				php: /^(?:([^:\/?#]+):)?(?:\/\/()(?:(?:()(?:([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?()(?:(()(?:(?:[^?#\/]*\/)*)()(?:[^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
				strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
				loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/\/?)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/ // Added one optional slash to post-scheme to catch file:/// (should restrict this)
			};

		var m = parser[mode].exec(str),
			uri = {},
			i = 14;
		while(i--){
			if(m[i]){
				uri[key[i]] = m[i];
			}
		}

		if(component){
			return uri[component.replace('PHP_URL_', '').toLowerCase()];
		}
		if(mode !== 'php'){
			var name = (ini['phpjs.parse_url.queryKey'] && ini['phpjs.parse_url.queryKey'].local_value) || 'queryKey';
			parser = /(?:^|&)([^&=]*)=?([^&]*)/g;
			uri[name] = {};
			query = uri[key[12]] || '';
			query.replace(parser, function($0, $1, $2){
				if($1){
					uri[name][$1] = $2;
				}
			});
		}
		delete uri.source;
		return uri;
	},
	array_multisort: function(arr){
		var flags = {
				'SORT_REGULAR': 16,
				'SORT_NUMERIC': 17,
				'SORT_STRING': 18,
				'SORT_ASC': 32,
				'SORT_DESC': 40
			},
		//argl = arguments.length,
		//args = arguments,
			sortArrsLength = 0,
			sortArrs = [[]],
			sortKeys = [[]],
			sortFlag = [0],
			g = 0,
			i = 0,
			j,// = 0
			k = '',
			l = 0,
			thingsToSort = [],
			vkey = 0,
			zlast = null,
			nLastSort = [],
			lastSort = [],
			lastSorts = [],
			tmpArray = [],
			elIndex = 0,
			sortDuplicator = function(){//a, b
				return nLastSort.shift();
			},
			sortFunctions = [
				[
					function(a, b){
						lastSort.push(a > b ? 1 : (a < b ? -1 : 0));
						return a > b ? 1 : (a < b ? -1 : 0);
					},
					function(a, b){
						lastSort.push(b > a ? 1 : (b < a ? -1 : 0));
						return b > a ? 1 : (b < a ? -1 : 0);
					}
				],
				[
					function(a, b){
						lastSort.push(a-b);
						return a-b;
					},
					function(a, b){
						lastSort.push(b-a);
						return b-a;
					}
				],
				[
					function(a, b){
						lastSort.push((a+'') > (b+'') ? 1 : ((a+'') < (b+'') ? -1 : 0));
						return (a+'') > (b+'') ? 1 : ((a+'') < (b+'') ? -1 : 0);
					},
					function(a, b){
						lastSort.push((b+'') > (a+'') ? 1 : ((b+'') < (a+'') ? -1 : 0));
						return (b+'') > (a+'') ? 1 : ((b+'') < (a+'') ? -1 : 0);
					}
				]
			];

		if(Object.prototype.toString.call(arr) === '[object Array]'){
			sortArrs[0] = arr;
		}
		else if(arr && typeof arr === 'object'){
			for(i in arr){
				if(arr.hasOwnProperty(i)){
					sortKeys[0].push(i);
					sortArrs[0].push(arr[i]);
				}
			}
		}
		else{
			return false;
		}

		var arrMainLength = sortArrs[0].length, sortComponents = [0, arrMainLength];

		for(j = 1; j < arguments.length; j++){
			if(Object.prototype.toString.call(arguments[j]) === '[object Array]'){
				sortArrs[j] = arguments[j];
				sortFlag[j] = 0;
				if(arguments[j].length !== arrMainLength){
					return false;
				}
			}
			else if(arguments[j] && typeof arguments[j] === 'object'){
				sortKeys[j] = [];
				sortArrs[j] = [];
				sortFlag[j] = 0;
				for(i in arguments[j]){
					if(arguments[j].hasOwnProperty(i)){
						sortKeys[j].push(i);
						sortArrs[j].push(arguments[j][i]);
					}
				}
				if(sortArrs[j].length !== arrMainLength){
					return false;
				}
			}
			else if(typeof arguments[j] === 'string'){
				var lFlag = sortFlag.pop();
				if(typeof flags[arguments[j]] === 'undefined' || ((((flags[arguments[j]]) >>> 4)&(lFlag >>> 4)) > 0)){
					return false;
				}
				sortFlag.push(lFlag+flags[arguments[j]]);
			}
			else{
				return false;
			}
		}

		for(i = 0; i !== arrMainLength; i++){
			thingsToSort.push(true);
		}

		for(i in sortArrs){
			if(sortArrs.hasOwnProperty(i)){
				lastSorts = [];
				tmpArray = [];
				elIndex = 0;
				nLastSort = [];
				lastSort = [];

				if(sortComponents.length === 0){
					if(Object.prototype.toString.call(arguments[i]) === '[object Array]'){
						arguments[i] = sortArrs[i]; // args -> arguments
					}
					else{
						for(k in arguments[i]){
							if(arguments[i].hasOwnProperty(k)){
								delete arguments[i][k];
							}
						}
						sortArrsLength = sortArrs[i].length;
						for(j = 0, vkey = 0; j < sortArrsLength; j++){
							vkey = sortKeys[i][j];
							arguments[i][vkey] = sortArrs[i][j]; // args -> arguments
						}
					}
					delete sortArrs[i];
					delete sortKeys[i];
					continue;
				}

				var sFunction = sortFunctions[(sortFlag[i]&3)][((sortFlag[i]&8) > 0) ? 1 : 0];

				for(l = 0; l !== sortComponents.length; l += 2){
					tmpArray = sortArrs[i].slice(sortComponents[l], sortComponents[l+1]+1);
					tmpArray.sort(sFunction);
					lastSorts[l] = [].concat(lastSort); // Is there a better way to copy an array in Javascript?
					elIndex = sortComponents[l];
					for(g in tmpArray){
						if(tmpArray.hasOwnProperty(g)){
							sortArrs[i][elIndex] = tmpArray[g];
							elIndex++;
						}
					}
				}

				sFunction = sortDuplicator;
				for(j in sortArrs){
					if(sortArrs.hasOwnProperty(j)){
						if(sortArrs[j] === sortArrs[i]){
							continue;
						}
						for(l = 0; l !== sortComponents.length; l += 2){
							tmpArray = sortArrs[j].slice(sortComponents[l], sortComponents[l+1]+1);
							nLastSort = [].concat(lastSorts[l]); // alert(l + ':' + nLastSort);
							tmpArray.sort(sFunction);
							elIndex = sortComponents[l];
							for(g in tmpArray){
								if(tmpArray.hasOwnProperty(g)){
									sortArrs[j][elIndex] = tmpArray[g];
									elIndex++;
								}
							}
						}
					}
				}

				for(j in sortKeys){
					if(sortKeys.hasOwnProperty(j)){
						for(l = 0; l !== sortComponents.length; l += 2){
							tmpArray = sortKeys[j].slice(sortComponents[l], sortComponents[l+1]+1);
							nLastSort = [].concat(lastSorts[l]);
							tmpArray.sort(sFunction);
							elIndex = sortComponents[l];
							for(g in tmpArray){
								if(tmpArray.hasOwnProperty(g)){
									sortKeys[j][elIndex] = tmpArray[g];
									elIndex++;
								}
							}
						}
					}
				}

				zlast = null;
				sortComponents = [];
				for(j in sortArrs[i]){
					if(sortArrs[i].hasOwnProperty(j)){
						if(!thingsToSort[j]){
							if((sortComponents.length&1)){
								sortComponents.push(j-1);
							}
							zlast = null;
							continue;
						}
						if(!(sortComponents.length&1)){
							if(zlast !== null){
								if(sortArrs[i][j] === zlast){
									sortComponents.push(j-1);
								}
								else{
									thingsToSort[j] = false;
								}
							}
							zlast = sortArrs[i][j];
						}
						else{
							if(sortArrs[i][j] !== zlast){
								sortComponents.push(j-1);
								zlast = sortArrs[i][j];
							}
						}
					}
				}

				if(sortComponents.length&1){
					sortComponents.push(j);
				}
				if(Object.prototype.toString.call(arguments[i]) === '[object Array]'){
					arguments[i] = sortArrs[i]; // args -> arguments
				}
				else{
					for(j in arguments[i]){
						if(arguments[i].hasOwnProperty(j)){
							delete arguments[i][j];
						}
					}

					sortArrsLength = sortArrs[i].length;
					for(j = 0, vkey = 0; j < sortArrsLength; j++){
						vkey = sortKeys[i][j];
						arguments[i][vkey] = sortArrs[i][j]; // args -> arguments
					}

				}
				delete sortArrs[i];
				delete sortKeys[i];
			}
		}
		return true;
	}
};


/**
 * Leaflet polyline decorator
 * (c) 2013 Benjamin Becquet
 * https://github.com/bbecquet/Leaflet.PolylineDecorator
 */

L.GeometryUtil = {
	computeAngle: function(a, b) {
		return (Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI) + 90;
	},

	getPointPathPixelLength: function(pts) {
		var nbPts = pts.length;
		if(nbPts < 2) {
			return 0;
		}
		var dist = 0;
		var prevPt = pts[0], pt;
		for(var i=1, l=pts.length; i<l; i++) {
			dist += prevPt.distanceTo(pt = pts[i]);
			prevPt = pt;
		}
		return dist;
	},

	getPixelLength: function(pl, map) {
		var ll = (pl instanceof L.Polyline) ? pl.getLatLngs() : pl;
		var nbPts = ll.length;
		if(nbPts < 2) {
			return 0;
		}
		var dist = 0;
		var prevPt = map.latLngToLayerPoint(ll[0]), pt;
		for(var i=1, l=ll.length; i<l; i++) {
			dist += prevPt.distanceTo(pt = map.latLngToLayerPoint(ll[i]));
			prevPt = pt;
		}
		return dist;
	},

	/**
	 * path: array of L.LatLng
	 * offsetRatio: the ratio of the total pixel length where the pattern will start
	 * repeatRatio: the ratio of the total pixel length between two points of the pattern
	 * map: the map, to access the current projection state
	 */
	projectPatternOnPath: function (path, offsetRatio, repeatRatio, map) {
		var pathAsPoints = [], i, l;
		for(i=0, l=path.length; i<l; i++) {
			pathAsPoints[i] = map.latLngToLayerPoint(path[i]);
		}
		// project the pattern as pixel points
		var pattern = this.projectPatternOnPointPath(pathAsPoints, offsetRatio, repeatRatio);
		// and convert it to latlngs;
		for(i=0, l=pattern.length; i<l; i++) {
			pattern[i].latLng = map.layerPointToLatLng(pattern[i].pt);
		}
		return pattern;
	},

	projectPatternOnPointPath: function (pts, offsetRatio, repeatRatio) {
		var positions = [];
		// 1. compute the absolute interval length in pixels
		var repeatIntervalLength = L.GeometryUtil.getPointPathPixelLength(pts) * repeatRatio;
		// 2. find the starting point by using the offsetRatio
		var previous = L.GeometryUtil.interpolateOnPointPath(pts, offsetRatio);
		positions.push(previous);
		if(repeatRatio > 0) {
			// 3. consider only the rest of the path, starting at the previous point
			var remainingPath = pts;
			remainingPath = remainingPath.slice(previous.predecessor);
			remainingPath[0] = previous.pt;
			var remainingLength = L.GeometryUtil.getPointPathPixelLength(remainingPath);
			// 4. project as a ratio of the remaining length,
			// and repeat while there is room for another point of the pattern
			while(repeatIntervalLength <= remainingLength) {
				previous = L.GeometryUtil.interpolateOnPointPath(remainingPath, repeatIntervalLength/remainingLength);
				positions.push(previous);
				remainingPath = remainingPath.slice(previous.predecessor);
				remainingPath[0] = previous.pt;
				remainingLength = L.GeometryUtil.getPointPathPixelLength(remainingPath);
			}
		}
		return positions;
	},

	/**
	 * pts: array of L.Point
	 * ratio: the ratio of the total length where the point should be computed
	 * Returns null if ll has less than 2 LatLng, or an object with the following properties:
	 *    latLng: the LatLng of the interpolated point
	 *    predecessor: the index of the previous vertex on the path
	 *    heading: the heading of the path at this point, in degrees
	 */
	interpolateOnPointPath: function (pts, ratio) {
		var nbVertices = pts.length;

		if (nbVertices < 2) {
			return null;
		}
		// easy limit cases: ratio negative/zero => first vertex
		if (ratio <= 0) {
			return {
				pt: pts[0],
				predecessor: 0,
				heading: L.GeometryUtil.computeAngle(pts[0], pts[1])
			};
		}
		// ratio >=1 => last vertex
		if (ratio >= 1) {
			return {
				pt: pts[nbVertices - 1],
				predecessor: nbVertices - 1,
				heading: L.GeometryUtil.computeAngle(pts[nbVertices - 2], pts[nbVertices - 1])
			};
		}
		// 1-segment-only path => direct linear interpolation
		if (nbVertices == 2) {
			return {
				pt: L.GeometryUtil.interpolateBetweenPoints(pts[0], pts[1], ratio),
				predecessor: 0,
				heading: L.GeometryUtil.computeAngle(pts[0], pts[1])
			};
		}

		var a, b,
			ratioA, ratioB,
			distB = 0,
			pathLength = L.GeometryUtil.getPointPathPixelLength(pts);
		a = b = pts[0];
		ratioA = ratioB = 0;
		// follow the path segments until we find the one
		// on which the point must lie => [ab]
		var i = 1;
		for (; i < nbVertices && ratioB < ratio; i++) {
			a = b;
			ratioA = ratioB;
			b = pts[i];
			distB += a.distanceTo(b);
			ratioB = distB / pathLength;
		}

		// compute the ratio relative to the segment [ab]
		var segmentRatio = (ratio - ratioA) / (ratioB - ratioA);

		return {
			pt: L.GeometryUtil.interpolateBetweenPoints(a, b, segmentRatio),
			predecessor: i-2,
			heading: L.GeometryUtil.computeAngle(a, b)
		}
	},

	/**
	 * Finds the point which lies on the segment defined by points A and B,
	 * at the given ratio of the distance from A to B, by linear interpolation.
	 */
	interpolateBetweenPoints: function (ptA, ptB, ratio) {
		return ptB.x != ptA.x ? new L.Point((ptA.x * (1 - ratio)) + (ratio * ptB.x), (ptA.y * (1 - ratio)) + (ratio * ptB.y)) : new L.Point(ptA.x, ptA.y + (ptB.y - ptA.y) * ratio);
	}
};

L.RotatedMarker = L.Marker.extend({
	options: {
		angle: 0
	},
	statics: {
		// determine the best and only CSS transform rule to use for this browser
		bestTransform: L.DomUtil.testProp([
			'transform',
			'WebkitTransform',
			'msTransform',
			'MozTransform',
			'OTransform'
		])
	},
	_setPos: function (pos) {
		L.Marker.prototype._setPos.call(this, pos);

		var rotate = ' rotate(' + this.options.angle + 'deg)';
		if (L.RotatedMarker.bestTransform) {
			// use the CSS transform rule if available
			this._icon.style[L.RotatedMarker.bestTransform] += rotate;
		} else if(L.Browser.ie) {
			// fallback for IE6, IE7, IE8
			var rad = this.options.angle * L.LatLng.DEG_TO_RAD,
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			this._icon.style.filter += ' progid:DXImageTransform.Microsoft.Matrix(sizingMethod=\'auto expand\', M11=' + costheta + ', M12=' + (-sintheta) + ', M21=' + sintheta + ', M22=' + costheta + ')';
		}
	}
});

/**
 * Defines several classes of symbol factories,
 * to be used with L.PolylineDecorator
 */

L.Symbol = L.Symbol || {};

/**
 * A simple dash symbol, drawn as a Polyline.
 * Can also be used for dots, if 'pixelSize' option is given the 0 value.
 */
L.Symbol.Dash = L.Class.extend({
	isZoomDependant: true,

	options: {
		pixelSize: 10,
		pathOptions: { }
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
		this.options.pathOptions.clickable = false;
	},

	buildSymbol: function(dirPoint, latLngs, map) {
		var opts = this.options;

		// for a dot, nothing more to compute
		if(opts.pixelSize <= 1) {
			return new L.Polyline([dirPoint.latLng, dirPoint.latLng], opts.pathOptions);
		}

		var midPoint = map.project(dirPoint.latLng);
		var angle = (-(dirPoint.heading - 90)) * L.LatLng.DEG_TO_RAD;
		var a = new L.Point(
			midPoint.x + opts.pixelSize * Math.cos(angle + Math.PI) / 2,
			midPoint.y + opts.pixelSize * Math.sin(angle) / 2
		);
		// compute second point by central symmetry to avoid unecessary cos/sin
		var b = midPoint.add(midPoint.subtract(a));
		return new L.Polyline([map.unproject(a), map.unproject(b)], opts.pathOptions);
	}
});

L.Symbol.ArrowHead = L.Class.extend({
	isZoomDependant: true,

	options: {
		polygon: true,
		pixelSize: 10,
		headAngle: 60,
		pathOptions: {
			stroke: false,
			weight: 2
		}
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
		this.options.pathOptions.clickable = false;
	},

	buildSymbol: function(dirPoint, latLngs, map) {
		var opts = this.options;
		var path;
		if(opts.polygon) {
			path = new L.Polygon(this._buildArrowPath(dirPoint, map), opts.pathOptions);
		} else {
			path = new L.Polyline(this._buildArrowPath(dirPoint, map), opts.pathOptions);
		}
		return path;
	},

	_buildArrowPath: function (dirPoint, map) {
		var tipPoint = map.project(dirPoint.latLng);
		var direction = (-(dirPoint.heading - 90)) * L.LatLng.DEG_TO_RAD;
		var radianArrowAngle = this.options.headAngle / 2 * L.LatLng.DEG_TO_RAD;

		var headAngle1 = direction + radianArrowAngle,
			headAngle2 = direction - radianArrowAngle;
		var arrowHead1 = new L.Point(
				tipPoint.x - this.options.pixelSize * Math.cos(headAngle1),
				tipPoint.y + this.options.pixelSize * Math.sin(headAngle1)),
			arrowHead2 = new L.Point(
				tipPoint.x - this.options.pixelSize * Math.cos(headAngle2),
				tipPoint.y + this.options.pixelSize * Math.sin(headAngle2));

		return [
			map.unproject(arrowHead1),
			dirPoint.latLng,
			map.unproject(arrowHead2)
		];
	}
});

L.Symbol.Marker = L.Class.extend({
	isZoomDependant: false,

	options: {
		markerOptions: { },
		rotate: false
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
		this.options.markerOptions.clickable = false;
		this.options.markerOptions.draggable = false;
		this.isZoomDependant = (L.Browser.ie && this.options.rotate);
	},

	buildSymbol: function(directionPoint) {
		if(!this.options.rotate) {
			return new L.Marker(directionPoint.latLng, this.options.markerOptions);
		}
		else {
			this.options.markerOptions.angle = directionPoint.heading;
			return new L.RotatedMarker(directionPoint.latLng, this.options.markerOptions);
		}
	}
});

L.PolylineDecorator = L.LayerGroup.extend({
	options: {
		patterns: []
	},

	initialize: function(polyline, options) {
		L.LayerGroup.prototype.initialize.call(this);
		L.Util.setOptions(this, options);
		this._polyline = polyline;
		this._directionPointCache = [];
		this._initPatterns();
	},

	_initPatterns: function() {
		this._directionPointCache = [];
		this._isZoomDependant = false;
		this._patterns = [];
		var pattern;
		// parse pattern definitions and precompute some values
		for(var i=0;i<this.options.patterns.length;i++) {
			pattern = this._parsePatternDef(this.options.patterns[i]);
			this._patterns.push(pattern);
			// determines if we have to recompute the pattern on each zoom change
			this._isZoomDependant = this._isZoomDependant
				|| pattern.isOffsetInPixels
				|| pattern.isRepeatInPixels
				|| pattern.symbolFactory.isZoomDependant;
		}
	},

	/**
	 * Changes the patterns used by this decorator
	 * and redraws the new one.
	 */
	setPatterns: function(patterns) {
		this.options.patterns = patterns;
		this._initPatterns();
		this._softRedraw();
	},

	/**
	 * Parse the pattern definition
	 */
	_parsePatternDef: function(patternDef) {
		var pattern = {
			cache: [],
			symbolFactory: patternDef.symbol,
			isOffsetInPixels: false,
			isRepeatInPixels: false
		};

		// Parse offset and repeat values, managing the two cases:
		// absolute (in pixels) or relative (in percentage of the polyline length)
		if(typeof patternDef.offset === 'string' && patternDef.offset.indexOf('%') != -1) {
			pattern.offset = parseFloat(patternDef.offset) / 100;
		} else {
			pattern.offset = parseFloat(patternDef.offset);
			pattern.isOffsetInPixels = (pattern.offset > 0);
		}


		if(typeof patternDef.repeat === 'string' && patternDef.repeat.indexOf('%') != -1) {
			pattern.repeat = parseFloat(patternDef.repeat) / 100;
		} else {
			pattern.repeat = parseFloat(patternDef.repeat);
			pattern.isRepeatInPixels = (pattern.repeat > 0);
		}

		// TODO: 0 => not pixel dependant => 0%

		return(pattern);
	},

	onAdd: function (map) {
		this._map = map;
		this._draw();
		// listen to zoom changes to redraw pixel-spaced patterns
		if(this._isZoomDependant) {
			this._map.on('zoomend', this._softRedraw, this);
		}
	},

	onRemove: function (map) {
		// remove optional map zoom listener
		this._map.off('zoomend', this._softRedraw, this);
		L.LayerGroup.prototype.onRemove.call(this, map);
	},

	/**
	 * Returns an array of ILayers object
	 */
	_buildSymbols: function(symbolFactory, directionPoints) {
		var symbols = [];
		for(var i=0, l=directionPoints.length; i<l; i++) {
			symbols.push(symbolFactory.buildSymbol(directionPoints[i], this._latLngs, this._map, i, l));
		}
		return symbols;
	},

	/**
	 * Select pairs of LatLng and heading angle,
	 * that define positions and directions of the symbols
	 * on the path
	 */
	_getDirectionPoints: function(pattern) {
		var dirPoints = pattern.cache[this._map.getZoom()];
		if(typeof dirPoints != 'undefined')
			return dirPoints;

		// polyline can be defined as a L.Polyline object or just an array of coordinates
		this._latLngs = (this._polyline instanceof L.Polyline) ? this._polyline.getLatLngs() : this._polyline;
		if(this._latLngs.length < 2) { return []; }
		// as of Leaflet >= v0.6, last polygon vertex (=first) isn't repeated.
		// our algorithm needs it, so we add it back explicitely.
		if(this._polyline instanceof L.Polygon) {
			this._latLngs.push(this._latLngs[0]);
		}

		var offset, repeat, pathPixelLength = null;
		if(pattern.isOffsetInPixels) {
			pathPixelLength =  L.GeometryUtil.getPixelLength(this._latLngs, this._map);
			offset = pattern.offset/pathPixelLength;
		} else {
			offset = pattern.offset;
		}
		if(pattern.isRepeatInPixels) {
			pathPixelLength = (pathPixelLength != null) ? pathPixelLength : L.GeometryUtil.getPixelLength(this._latLngs, this._map);
			repeat = pattern.repeat/pathPixelLength;
		} else {
			repeat = pattern.repeat;
		}
		dirPoints = L.GeometryUtil.projectPatternOnPath(this._latLngs, offset, repeat, this._map);
		pattern.cache[this._map.getZoom()] = dirPoints;

		return dirPoints;
	},

	/**
	 * Public redraw, invalidating the cache.
	 */
	redraw: function() {
		this._redraw(true);
	},

	/**
	 * "Soft" redraw, called internally for example on zoom changes,
	 * keeping the cache.
	 */
	_softRedraw: function() {
		this._redraw(false);
	},

	_redraw: function(clearCache) {
		this.clearLayers();
		if(clearCache) {
			for(var i=0; i<this._patterns.length; i++) {
				this._patterns[i].cache = [];
			}
		}
		this._draw();
	},

	/**
	 * Draw a single pattern
	 */
	_drawPattern: function(pattern) {
		var directionPoints = this._getDirectionPoints(pattern);
		var symbols = this._buildSymbols(pattern.symbolFactory, directionPoints);
		for (var i=0; i < symbols.length; i++) {
			this.addLayer(symbols[i]);
		}
	},

	/**
	 * Draw all patterns
	 */
	_draw: function () {
		for(var i=0; i<this._patterns.length; i++) {
			this._drawPattern(this._patterns[i]);
		}
	}
});
/*
 * Allows compact syntax to be used
 */
L.polylineDecorator = function (polyline, options) {
	return new L.PolylineDecorator(polyline, options);
};