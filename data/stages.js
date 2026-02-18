const stagesData = [
  {
    "id": 1,
    "title": "Level 1: Port 80 Blocked",
    "desc": "Nginx service is down. Investigate the logs.",
    "fs": { "/var/log/nginx/error.log": "bind() to 0.0.0.0:80 failed (Address already in use)" },
    "solution": "killall apache2",
    "hint": "Check /var/log/nginx/error.log. Is another web server running?",
    "article": "<h3>Port Conflict</h3><p>In Linux, only one process can use a port at a time. Port 80 is the default for HTTP.</p>"
  },
  {
    "id": 2,
    "title": "Level 2: Permission Trap",
    "desc": "Nginx cannot read the configuration file.",
    "fs": { "/etc/nginx/nginx.conf": "Error: Permission Denied" },
    "solution": "chmod 644 /etc/nginx/nginx.conf",
    "hint": "Configuration files should be readable. Try chmod 644.",
    "article": "<h3>File Permissions</h3><p>Config files should be 644 (root:rw, others:r) for services to read them.</p>"
  },
  {
    "id": 3,
    "title": "Level 3: Disk Space Exhausted",
    "desc": "System says 'No space left on device'.",
    "fs": { "/var/log/syslog": "write error: No space left on device" },
    "solution": "rm -rf /tmp/large_temp_file.log",
    "hint": "Check /tmp for large logs and delete them with rm.",
    "article": "<h3>Disk Management</h3><p>When the disk is 100% full, services cannot write logs and will crash.</p>"
  },
  {
    "id": 4,
    "title": "Level 4: Corrupted SSH Key",
    "desc": "SSH access failing: Host key permissions are too open.",
    "fs": { "/etc/ssh/ssh_host_rsa_key": "Permissions 0777 are too open." },
    "solution": "chmod 600 /etc/ssh/ssh_host_rsa_key",
    "hint": "Private keys must be protected. Use chmod 600.",
    "article": "<h3>SSH Security</h3><p>SSH refuses to use private keys that are accessible by other users.</p>"
  },
  {
    "id": 5,
    "title": "Level 5: Missing Dependency",
    "desc": "Binary 'app' won't run. libssl.so.1.1 is missing.",
    "fs": { "error": "cannot open shared object file: No such file or directory" },
    "solution": "apt-get install libssl-dev",
    "hint": "You need to install the SSL development library via apt-get.",
    "article": "<h3>Shared Libraries</h3><p>Installing the -dev package usually restores missing .so files.</p>"
  },
  {
    "id": 6,
    "title": "Level 6: Wrong Owner",
    "desc": "Web directory is owned by root, but www-data needs access.",
    "fs": { "/var/www/html": "Owner: root, Permissions: drwxr-xr-x" },
    "solution": "chown www-data:www-data /var/www/html",
    "hint": "Change the owner to www-data using chown.",
    "article": "<h3>Ownership</h3><p>Changing file owners is crucial for service-specific directory access.</p>"
  },
  {
    "id": 7,
    "title": "Level 7: Zombie Process",
    "desc": "A stuck app is consuming resources. Normal kill fails.",
    "fs": { "ps": "PID 9999: [app] <defunct>" },
    "solution": "kill -9 9999",
    "hint": "Use the force signal (-9) to terminate the process.",
    "article": "<h3>Process Signals</h3><p>Signal 9 (SIGKILL) forces a process to terminate immediately.</p>"
  },
  {
    "id": 8,
    "title": "Level 8: DNS Resolution Failure",
    "desc": "Names don't resolve. Server can't reach the internet.",
    "fs": { "/etc/resolv.conf": "nameserver 0.0.0.0" },
    "solution": "echo 'nameserver 8.8.8.8' > /etc/resolv.conf",
    "hint": "Set a valid nameserver like 8.8.8.8 in resolv.conf.",
    "article": "<h3>DNS Config</h3><p>/etc/resolv.conf controls how domain names are resolved.</p>"
  },
  {
    "id": 9,
    "title": "Level 9: SWAP Pressure",
    "desc": "System slow. RAM is full and swap is inactive.",
    "fs": { "/proc/swaps": "Filename: (empty)" },
    "solution": "swapon /swapfile",
    "hint": "Check /proc/swaps and enable it with swapon.",
    "article": "<h3>Swap Space</h3><p>Swap acts as virtual memory on the disk when RAM is full.</p>"
  },
  {
    "id": 10,
    "title": "Level 10: Kernel Module Missing",
    "desc": "Iptables failing: Module ip_tables not found.",
    "fs": { "dmesg": "modprobe: FATAL: Module ip_tables not found." },
    "solution": "modprobe ip_tables",
    "hint": "Load the module using modprobe.",
    "article": "<h3>Kernel Modules</h3><p>modprobe loads features into the Linux kernel on-the-fly.</p>"
  }
];