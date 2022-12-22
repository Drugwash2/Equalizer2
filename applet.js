// Drugwash, 2022 ; GPL v2+
const Applet = imports.ui.applet;
const AppletManager = imports.ui.appletManager;
const Cinnamon = imports.gi.Cinnamon;
const Cvc = imports.gi.Cvc;
const Ext = imports.ui.extension;
const Gettext = imports.gettext;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Signals = imports.signals;
const St = imports.gi.St;
const Util = imports.misc.util;

const ITYPE = imports.gi.St.IconType.SYMBOLIC;
const UUID = "pa-equalizer2@drugwash";

const APLTDIR = GetApltDir();
const HLPTXT = APLTDIR + "/README.md";
const [EXEC, LOCAL] = HasEq();
const EXEGUI = EXEC + "-gtk";

const CONFIG_DIR_OLD = GLib.get_home_dir() + "/.pulse";
const CONFIG_DIR_NEW = GLib.get_user_config_dir() + "/pulse";
const CONFIG_DIR = GLib.file_test(CONFIG_DIR_NEW, GLib.FileTest.IS_DIR) ? CONFIG_DIR_NEW: CONFIG_DIR_OLD;

const EQCONFIG = CONFIG_DIR + "/equalizerrc";
const EQPRESETS = EQCONFIG + ".availablepresets";
const PRESETDIR1 = CONFIG_DIR + "/presets/";
const PRESETDIR2 = "/usr" + LOCAL + "/share/" + EXEC + "/presets/";

const EQON = "equalizer";
const EQOFF = "equalizer_off";
const DBG = false;
Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "/.local/share/locale")

function _(str) {
	return Gettext.dgettext(UUID, str);
}

function GetApltDir() {
	var type = Ext.Type["APPLET"]
	let dir = Ext.findExtensionDirectory(UUID, type.userDir, type.folder);
	return dir.get_path();
}

function HasEq() {
	let e = GLib.file_test("/usr/bin/pulseaudio-equalizer-ladspa", GLib.FileTest.EXISTS) ? 1 :
 	GLib.file_test("/usr/local/bin/pulseaudio-equalizer-ladspa", GLib.FileTest.EXISTS) ? 2 :
	GLib.file_test("/usr/bin/pulseaudio-equalizer", GLib.FileTest.EXISTS) ? 3 :
	GLib.file_test("/usr/local/bin/pulseaudio-equalizer", GLib.FileTest.EXISTS) ? 4 : 0;
 	let s1 = (e == 1 || e == 2) ? "pulseaudio-equalizer-ladspa" :
 		(e == 3 || e == 4) ? "pulseaudio-equalizer" : "";
 	let s2 = (e == 2 || e == 4) ? "/local" : "";
	if (e == 0) {
		global.logError(_("pulseaudio-equalizer is not installed"));
//		GLib.spawn_command_line_sync("xdg-open " + APLTDIR + "/README.md");
		Util.spawnCommandLine("xdg-open " + HLPTXT);
// we need applet exit here if pa-equalizer is not installed
//		AppletManager._removeAppletFromPanel(UUID, this.instance_id);
//		throw new Error("pulseaudio-equalizer is not installed");
	}
	return [s1, s2];
}

function Config() {
	this._init();
}

Config.prototype = {
	_init: function() {
		this.load();
	},
	load: function() {
		try {
			GLib.spawn_command_line_sync(EXEC + " interface.getsettings");
			this._monitor = Gio.file_new_for_path(EQCONFIG).monitor(Gio.FileMonitorFlags.NONE, null);
			this._monitor.connect("changed", Lang.bind(this, function(self, file, otherFile, eventType) {
				if (eventType == Gio.FileMonitorEvent.CHANGES_DONE_HINT) {
					this._configChanged();
				}
			}));

			this._rawdata = Cinnamon.get_file_contents_utf8_sync(EQCONFIG).split('\n');
			this.presets = Cinnamon.get_file_contents_utf8_sync(EQPRESETS).split('\n')
						.filter(function(item) { return item.length > 0; });
		} catch (e) {
			global.logError(e);
		}
	},
	save: function() {
		try {
			this._monitor.cancel()
			let out = Gio.file_new_for_path(EQCONFIG).replace(null, false, Gio.FileCreateFlags.NONE, null);
			out.write_all(this._rawdata.join('\n'), null);
			out.close(null);

			GLib.spawn_command_line_sync(EXEC + " interface.applysettings");
			this.load();
			this.emit("changed");
		} catch (e) {
			global.logError(e);
		}
	},
	enabled: function() {
		return this._rawdata[5] == 1;
	},
	set_enabled: function(enabled) {
		this._rawdata[5] = enabled?1:0;
		this.save();
	},
	toggle: function() {
		this.set_enabled(!this.enabled());
	},
	preset: function() {
		return this._rawdata[4];
	},
	set_preset: function(preset) {
		let file = Gio.file_new_for_path(PRESETDIR1 + preset + ".preset");
		let rawdata = null;
		if (file.query_exists(null)) {
			rawdata = Cinnamon.get_file_contents_utf8_sync(file.get_path()).split('\n');
		} else {
			file = Gio.file_new_for_path(PRESETDIR2 + preset + ".preset");
			if (file.query_exists(null)) {
				rawdata = Cinnamon.get_file_contents_utf8_sync(file.get_path()).split('\n');
			} else {
				return;
			}
		}
		for (let i = 0; i < 5; ++i) {
			if (i == 3) {
				continue;
			}
			this._rawdata[i] = rawdata[i];
		}
		this._rawdata[9] = rawdata[5];
		this._rawdata = this._rawdata.slice(0, 10);
		for (let i = 10; i < (11+2*parseInt(rawdata[5])); ++i) {
			this._rawdata[i] = rawdata[i - 4];
		}
		this.save();
	},
	_configChanged: function() {
		this._monitor.cancel();
		this.load();
		this.emit("changed");
	}
};
Signals.addSignalMethods(Config.prototype);

function EqualizerApplet(metadata, orientation, panel_height, instanceId) {
	this._init(metadata, orientation, panel_height, instanceId);
}

EqualizerApplet.prototype = {
	__proto__: Applet.IconApplet.prototype,
	_init: function(metadata, orientation, panel_height, instanceId) {
		Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instanceId);
		this.id = instanceId;
		if (EXEC == "")
			AppletManager._removeAppletFromPanel(UUID, this.id);
		try {
			this._notification = null; this.restore = null;
            this.settings = new Settings.AppletSettings(this, metadata.uuid, this.id);
            this.settings.bind("notify", "notify");
			this.state = _("Equalizer <b>disabled</b>"); //this.notify=true;
			this.config = new Config();
			this.config.connect("changed", Lang.bind(this, this._configChanged));
			this.cvctrl = new Cvc.MixerControl({ name: "SndMixer" });
            this.cvctrl.connect("output-added", Lang.bind(this, this._addDevice));
			this.cvctrl.connect("active-output-update", Lang.bind(this, this._outputChanged, "update"));

			Gtk.IconTheme.get_default().append_search_path(metadata.path);
			this.set_applet_icon_symbolic_name(EQOFF);

			this.menuManager = new PopupMenu.PopupMenuManager(this);
			this.menu = new Applet.AppletPopupMenu(this, orientation);
			this.menuManager.addMenu(this.menu);

			this._enabledSwitch = new PopupMenu.PopupSwitchMenuItem(_("Equalizer"),
									this.config.enabled());
			this.menu.addMenuItem(this._enabledSwitch);
			this._enabledSwitch.connect("toggled", Lang.bind(this.config, this.config.toggle));

			this._presetsItem = new PopupMenu.PopupSubMenuMenuItem(_("Presets"));
			this.menu.addMenuItem(this._presetsItem);

			this._settingsItem = new PopupMenu.PopupMenuItem(_("Settings"));
			this.menu.addMenuItem(this._settingsItem);
			this._settingsItem.connect("activate", function() {
//				GLib.spawn_command_line_async(EXEGUI);
				Util.spawnCommandLineAsync(EXEGUI, null, null);
			});
		// notification toggle
			this.notify_menu =  new PopupMenu.PopupIndicatorMenuItem(_("Show notifications"));
			this.notify_menu.setOrnament(1, this.notify); // OrnamentType.CHECK
			this.notify_menu.connect('activate', Lang.bind(this, function() {
				this.notify = !this.notify;
				this.settings.setValue("notify", this.notify);
				this.notify_menu.setOrnament(1, this.notify); // OrnamentType.CHECK
			}));
			this._applet_context_menu.addMenuItem(this.notify_menu);
		//_context_menu_item_help
			if (GLib.file_test(HLPTXT, GLib.FileTest.EXISTS)) {
				this.help_menu =  new PopupMenu.PopupIconMenuItem(_("Help"),
					"dialog-question", ITYPE);
				this.help_menu.connect('activate', Lang.bind(this, function() {
					try { Util.spawnCommandLine(`xdg-open ` + HLPTXT); }
					catch(e) { global.logError(UUID + _(": 'xdg-open' cannot open the help file ") + HLPTXT); }
				}));
				this._applet_context_menu.addMenuItem(this.help_menu);
			} else global.logError(UUID + _(": missing help file ") + HLPTXT);
			//_context_menu_item_reload_applet
/*			let cmnd = `dbus-send --session --dest=org.Cinnamon.LookingGlass --type=method_call ` +
							`/org/Cinnamon/LookingGlass org.Cinnamon.LookingGlass.ReloadExtension ` +
							`string:'${UUID}' string:'APPLET'`;
			this._applet_context_menu.addCommandlineAction(_("Reload applet [forced]"), cmnd); */
			this.reload_menu = new PopupMenu.PopupIconMenuItem(_("Reload applet [forced]"), "reload", St.IconType.FULLCOLOR);
			this.reload_menu.connect('activate', Lang.bind(this, function() {
				Ext.reloadExtension(UUID, Ext.Type.APPLET);
			}));
			this._applet_context_menu.addMenuItem(this.reload_menu);
			this._applet_tooltip._tooltip.use_markup = true;
			this._applet_tooltip._tooltip.clutter_text.ellipsize = false;
			this.cvctrl.open();
			this._configChanged();
		} catch (e) {
			global.logError(e);
			AppletManager._removeAppletFromPanel(UUID, this.id);
		}
	},
	on_applet_clicked: function(event) {
		this.menu.toggle();
	},
	_configChanged: function() {
		let enabled = this.config.enabled();
		this._enabledSwitch.setToggleState(enabled);
		this._presetsItem.menu.removeAll();
		for (let i = 0; i < this.config.presets.length; ++i) {
			let preset = this.config.presets[i];
			let menuItem = new PopupMenu.PopupMenuItem(preset);
			if (preset === this.config.preset()) {
				menuItem.setShowDot(true);
			}
			menuItem.connect("activate", Lang.bind(this.config, function() {
				this.set_preset(preset);
			}));
			this._presetsItem.menu.addMenuItem(menuItem);
		}
		this.set_applet_icon_symbolic_name(enabled ? EQON : EQOFF);
		this._setTooltip(enabled);
		if (this.restore) this._restore();
	},
	_setTooltip: function(enabled, out="") {
		this.state = enabled ? _("Equalizer <b>enabled</b>") : _("Equalizer <b>disabled</b>");
		let pre = enabled ? "\n" + _("Preset: <b>") + this.config.preset() + "</b>" : "";
		let msg = out ? "\n" + out + pre : pre;
		this._applet_tooltip._tooltip.get_clutter_text().set_markup(this.state + msg);
		this._applet_tooltip._tooltip.get_clutter_text().set_markup(this.state + msg);
		return (out + pre);
	},
// these won't work unless Cvc is open() ===>
	_addDevice: function(control, id) {
		let d = this.cvctrl["lookup_output_id"](id);
		if (d.description.match(/(Multiband\sEQ|Plugin|LADSPA)/g)) return;
		this._log("added output: " + d.description + ", " + d.origin);
	},
	_outputChanged: function(control, id, type="state") {
		let enabled = this.config.enabled();
		let out = this.cvctrl.get_default_sink();
		if (enabled === false || type=="state"|| !out) return;
		let d = this.cvctrl["lookup_output_id"](id);
		let desc = d.description; let orig = d.origin;
		if (!orig || desc.match(/(Multiband\sEQ|Plugin|LADSPA)/g)) {
			let msg = this._setTooltip(enabled, desc.match(/\s(on\s.*)/)[1]);
			if (this.notify) this._notifyMessage(EQON, msg);
			this._log("found EQ, skipping");
			return;
		}
		this.restore = true;
		this.config.toggle();
	},
	_restore: function() {
		this.restore = null;
		this.config.toggle();
		this._setTooltip(enabled);
		if (this.notify) this._notifyMessage(EQON);
		this._log(type + " output: " + desc + " < " + enabled.toString());
	},
// <===
	_ensureSource: function() {
		if (!this._source) {
			this._source = new MessageTray.Source();
			this._source.connect('destroy', () => this._source = null );
			if (Main.messageTray) Main.messageTray.add(this._source);
		}
	},

	_notifyMessage: function(iconName, text="") {
		if (this._notification)
			this._notification.destroy();
		this._ensureSource();
		let icon = new St.Icon({
			icon_name: iconName,
			icon_type: St.IconType.SYMBOLIC,
			icon_size: 32
		});
		this._notification = new MessageTray.Notification(this._source, this.state, text, {
			icon: icon, titleMarkup: true, bodyMarkup: true, bannerMarkup: true
		});
		this._notification.setUrgency(MessageTray.Urgency.NORMAL);
		this._notification.setTransient(true);
		this._notification.connect('destroy', Lang.bind(this, function() {
			this._notification = null;
		}));
		this._source.notify(this._notification);
	},

	on_applet_removed_from_panel: function() {
	  	try {
			if (this.config._monitor) {
				this.config._monitor.cancel();
			}
			Signals._disconnectAll(Config.prototype);
			this.settings.finalize();
		} catch(e) {global.log("Equalizer2: " + e);}
	},
	_log: function(strg) {
		if (DBG) global.log(strg);
	}
};

function main(metadata, orientation, panel_height, instanceId) {
	return new EqualizerApplet(metadata, orientation, panel_height, instanceId);
}
