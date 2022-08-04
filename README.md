**Equalizer 2** is a Cinnamon Desktop applet which provides a quick and easy way to switch between audio equalizer presets or turn equalizer on/off.

#### Requires 3rd Party Package »pulseaudio-equalizer«

==Please note== the official **pulseaudio-equalizer** that comes with the operating system is not supported!
***
* One third-party package is available through [PPA maintained by Web Upd8](http://www.webupd8.org/2013/10/system-wide-pulseaudio-equalizer.html)

To install »pulseaudio-equalizer« from the above PPA:
```
sudo add-apt-repository ppa:nilarimogard/webupd8
sudo apt-get update
sudo apt-get install pulseaudio-equalizer=2.7.0.2-5~webupd8~xenial0
```

If the above fails (possibly on VERY old OS versions) then try

```
sudo apt-get install pulseaudio-equalizer
```

More detailed instructions and ready-made packages [here](https://ubuntu-mate.community/t/how-to-install-the-pulseaudio-equalizer-which-works/14773)

To manually run the GUI interface of this version type in Terminal:

```
pulseaudio-equalizer-gtk
```

***
* Alternatively and preferrably, install the newer LADSPA version.

Read [here](https://ubuntu-mate.community/t/pulseaudio-equalizer-ladspa-getting-3-0-2-now-without-a-package/24667) how to uninstall the webupd8 version (if installed) and install the new one.

The sources for the LADSPA version can be found [here](https://github.com/pulseaudio-equalizer-ladspa/equalizer).


#### How to build the new version

	git clone https://github.com/pulseaudio-equalizer-ladspa/equalizer.git
	cd ./equalizer
	meson build
	cd ./build
	ninja
	(sudo) ninja install

For those that can't build the package themselves there are ready-made *.deb* packages available, courtesy of user **phoca** at [ubuntu-mate.community](https://ubuntu-mate.community/t/how-to-install-the-pulseaudio-equalizer-which-works/14773/35):

* Package of v**3.0.2** for Ubuntu **Focal** (Mint **20.x**) [here](https://drive.google.com/file/d/1q2TEwMpEsqY4aTRzJCBIu8yr-weK1_XG/view)
* Package of v**3.0.0** for Ubuntu **Bionic** (Mint **19.x**) [here](https://drive.google.com/file/d/1duMBio3_bue9Sfo0VG2SoRmyxr6uPJeQ/view)

#### How to install the above packages

Focal:

```
sudo dpkg -i ./pulseaudio-equalizer-ladspa_3.0.2-1~eoan_all.deb
sudo apt install -f -y
```

Bionic:

```
sudo dpkg -i ./pulseaudio-equalizer-ladspa_3.0.0pre-1~bionic_all.deb
sudo apt install -f -y
```

To manually run the GUI interface of this newer version type in Terminal:

```
pulseaudio-equalizer-ladspa-gtk
```

***

The applet will only work correctly after any of the above-mentioned equalizer versions is installed. If you already enabled it prior to installing the equalizer you will have to reload the applet.

To do that *right-click* the panel, go to **Troubleshoot**, launch **Looking Glass**, switch to the **Extensions** tab at the bottom, find in list '**Equalizer 2**', *right-click* it and choose '**Reload Code**'.

This may seem convoluted as compared to opening the **Applets** panel and turning the applet *off* and then *on* again, but it provides an easy way to check whether anything goes wrong by switching to the **Log** tab and looking for related errors, if any.

==Please note== that the equalizer itself will have to be turned on **before** switching audio output sources - such as turning on bluetooth headphones - otherwise it will **not** detect and switch to that audio output. This applet has a switch for that in its menu.

***

All credit goes to the original author of this applet **jschug(.com)** and any other later contributors before me.

*Drugwash, 2022.08.04*
