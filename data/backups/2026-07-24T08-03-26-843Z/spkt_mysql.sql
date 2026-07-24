SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;
CREATE TABLE users (
      id VARCHAR(100) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      nik LONGTEXT,
      phone LONGTEXT,
      role VARCHAR(255) NOT NULL 
    , active INTEGER NOT NULL DEFAULT 1, address LONGTEXT, avatar_url LONGTEXT, preferences_json VARCHAR(255) NOT NULL DEFAULT '{}', totp_secret LONGTEXT, totp_enabled INTEGER NOT NULL DEFAULT 0);
CREATE TABLE audit_logs (
      id VARCHAR(100) PRIMARY KEY,
      actor_id VARCHAR(255) NOT NULL,
      actor_name VARCHAR(255) NOT NULL,
      action VARCHAR(255) NOT NULL,
      entity_type VARCHAR(255) NOT NULL,
      entity_id VARCHAR(255) NOT NULL,
      details LONGTEXT,
      created_at VARCHAR(255) NOT NULL
    );
INSERT INTO `audit_logs` VALUES('AUD178142229712257s5','U003','Kompol. Sarah Putri','update_user','user','U001','{"active":false}','2026-06-14T07:31:37.122Z');
INSERT INTO `audit_logs` VALUES('AUD17814224084577x4e','U003','Kompol. Sarah Putri','update_user','user','U001','{"active":true}','2026-06-14T07:33:28.458Z');
INSERT INTO `audit_logs` VALUES('AUD1782652069646cz22','U003','Kompol. Sarah Putri','delete_officer','officer','OFF002','Petugas dihapus','2026-06-28T13:07:49.646Z');
INSERT INTO `audit_logs` VALUES('AUD1782655315862jyy5','U003','SUPERADMIN','reassign_officer','report','R1782655234803','Ditugaskan ke officer OFF001','2026-06-28T14:01:55.862Z');
INSERT INTO `audit_logs` VALUES('AUD1782655315869k0gj','U003','SUPERADMIN','reassign_officer','report','R1782655234803','Ditugaskan ke officer OFF001','2026-06-28T14:01:55.869Z');
INSERT INTO `audit_logs` VALUES('AUD1782656350213nih5','U003','SUPERADMIN','reassign_officer','report','R1782656300278','Ditugaskan ke officer OFF001','2026-06-28T14:19:10.213Z');
INSERT INTO `audit_logs` VALUES('AUD1782657040440uc9k','U003','SUPERADMIN','assign_complaint','complaint','C1782657006527','Ditugaskan ke officer OFF003','2026-06-28T14:30:40.440Z');
INSERT INTO `audit_logs` VALUES('AUD1782657083538abng','U005','Aipda. Rini Kusuma','update_complaint_status','complaint','C1782657006527','Status submitted → reviewing','2026-06-28T14:31:23.538Z');
INSERT INTO `audit_logs` VALUES('AUD1782657095347sdwq','U005','Aipda. Rini Kusuma','update_complaint_status','complaint','C1782657006527','Status reviewing → processing','2026-06-28T14:31:35.347Z');
INSERT INTO `audit_logs` VALUES('AUD17826571014043jjx','U005','Aipda. Rini Kusuma','update_complaint_status','complaint','C1782657006527','Status processing → resolved','2026-06-28T14:31:41.404Z');
INSERT INTO `audit_logs` VALUES('AUD17826591565536rg4','U003','SUPERADMIN','update_complaint_status','complaint','C1782659074995','Status submitted → reviewing','2026-06-28T15:05:56.553Z');
INSERT INTO `audit_logs` VALUES('AUD17826591565549smq','U003','SUPERADMIN','assign_complaint','complaint','C1782659074995','Ditugaskan ke officer OFF003','2026-06-28T15:05:56.554Z');
CREATE TABLE complaint_files (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      complaint_id VARCHAR(255) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
    );
INSERT INTO `complaint_files` VALUES(1,'C1782657004427','U001_1782657004081_dcd83de8_Cuplikan_layar_2026-06-14_101814.png');
INSERT INTO `complaint_files` VALUES(2,'C1782657004489','U001_1782657004082_bd3199e4_Cuplikan_layar_2026-06-14_101814.png');
INSERT INTO `complaint_files` VALUES(3,'C1782657006011','U001_1782657004536_49f28666_Cuplikan_layar_2026-06-14_101814.png');
INSERT INTO `complaint_files` VALUES(4,'C1782657006527','U001_1782657006278_6621be6d_Cuplikan_layar_2026-06-14_101814.png');
INSERT INTO `complaint_files` VALUES(5,'C1782659074174','U001_1782659072072_dee389e5_Cuplikan_layar_2026-06-14_101814.png');
INSERT INTO `complaint_files` VALUES(6,'C1782659074995','U001_1782659074745_99cb6bfa_Cuplikan_layar_2026-06-14_101814.png');
CREATE TABLE complaint_timeline (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      complaint_id VARCHAR(255) NOT NULL,
      status VARCHAR(255) NOT NULL,
      timestamp VARCHAR(255) NOT NULL,
      note LONGTEXT,
      officer LONGTEXT,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
    );
INSERT INTO `complaint_timeline` VALUES(1,'C001','Pengaduan dibuat','2026-05-10T10:00:00',NULL,NULL);
INSERT INTO `complaint_timeline` VALUES(2,'C002','Pengaduan dibuat','2026-05-15T09:00:00',NULL,NULL);
INSERT INTO `complaint_timeline` VALUES(3,'C1782657004427','Pengaduan dibuat','2026-06-28T14:30:04.430Z',NULL,NULL);
INSERT INTO `complaint_timeline` VALUES(4,'C1782657004489','Pengaduan dibuat','2026-06-28T14:30:04.491Z',NULL,NULL);
INSERT INTO `complaint_timeline` VALUES(5,'C1782657006011','Pengaduan dibuat','2026-06-28T14:30:06.013Z',NULL,NULL);
INSERT INTO `complaint_timeline` VALUES(6,'C1782657006527','Pengaduan dibuat','2026-06-28T14:30:06.529Z',NULL,NULL);
INSERT INTO `complaint_timeline` VALUES(7,'C1782657006527','Sedang ditinjau','2026-06-28T14:31:23.534Z',NULL,'Aipda. Rini Kusuma');
INSERT INTO `complaint_timeline` VALUES(8,'C1782657006527','Sedang diproses','2026-06-28T14:31:35.342Z',NULL,'Aipda. Rini Kusuma');
INSERT INTO `complaint_timeline` VALUES(9,'C1782657006527','Pengaduan diselesaikan','2026-06-28T14:31:41.399Z',NULL,'Aipda. Rini Kusuma');
INSERT INTO `complaint_timeline` VALUES(10,'C1782659074174','Pengaduan dibuat','2026-06-28T15:04:34.178Z',NULL,NULL);
INSERT INTO `complaint_timeline` VALUES(11,'C1782659074995','Pengaduan dibuat','2026-06-28T15:04:34.997Z',NULL,NULL);
INSERT INTO `complaint_timeline` VALUES(12,'C1782659074995','Sedang ditinjau','2026-06-28T15:05:56.548Z','Ditugaskan ke petugas','SUPERADMIN');
CREATE TABLE complaints (
      id VARCHAR(100) PRIMARY KEY,
      complaint_number VARCHAR(255) NOT NULL UNIQUE,
      submitter_user_id VARCHAR(100),
      submitter_name VARCHAR(255) NOT NULL,
      submitter_nik VARCHAR(100),
      category VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      description VARCHAR(255) NOT NULL,
      status VARCHAR(255) NOT NULL DEFAULT 'submitted',
      response LONGTEXT,
      response_date VARCHAR(100),
      created_at VARCHAR(255) NOT NULL,
      updated_at VARCHAR(255) NOT NULL, assigned_officer_id VARCHAR(100), assigned_to LONGTEXT, assigned_by LONGTEXT, assigned_at VARCHAR(100),
      FOREIGN KEY (submitter_user_id) REFERENCES users(id)
    );
INSERT INTO `complaints` VALUES('C001','ADU/001/V/2026','U001','Budi Santoso','3201012345678901','pelayanan','Proses laporan terlalu lama','Sudah 2 minggu laporan saya belum diproses','resolved','Terima kasih atas masukannya. Laporan Anda telah kami proses dan selesai.','2026-05-18T14:30:00','2026-05-10T10:00:00','2026-05-18T14:30:00',NULL,NULL,NULL,NULL);
INSERT INTO `complaints` VALUES('C002','ADU/002/V/2026','U001','Budi Santoso','3201012345678901','sistem','Error saat upload dokumen','Sistem error ketika saya mencoba upload file PDF','processing','Sedang dalam penanganan tim teknis kami.','2026-06-14T06:37:40.507Z','2026-05-15T09:00:00','2026-06-14T06:37:40.507Z',NULL,NULL,NULL,NULL);
INSERT INTO `complaints` VALUES('C1782657004427','ADU/003/V/2026','U001','Budi Santoso','3201012345678901','fasilitas','xvbv','assaaasd','submitted',NULL,NULL,'2026-06-28T14:30:04.430Z','2026-06-28T14:30:04.430Z',NULL,NULL,NULL,NULL);
INSERT INTO `complaints` VALUES('C1782657004489','ADU/004/V/2026','U001','Budi Santoso','3201012345678901','fasilitas','xvbv','assaaasd','submitted',NULL,NULL,'2026-06-28T14:30:04.491Z','2026-06-28T14:30:04.491Z',NULL,NULL,NULL,NULL);
INSERT INTO `complaints` VALUES('C1782657006011','ADU/005/V/2026','U001','Budi Santoso','3201012345678901','fasilitas','xvbv','assaaasd','submitted',NULL,NULL,'2026-06-28T14:30:06.013Z','2026-06-28T14:30:06.013Z',NULL,NULL,NULL,NULL);
INSERT INTO `complaints` VALUES('C1782657006527','ADU/006/V/2026','U001','Budi Santoso','3201012345678901','fasilitas','xvbv','assaaasd','resolved','mmbn vn','2026-06-28T14:31:41.399Z','2026-06-28T14:30:06.529Z','2026-06-28T14:31:41.399Z','OFF003','Aipda. Rini Kusuma','SUPERADMIN','2026-06-28T14:30:40.438Z');
INSERT INTO `complaints` VALUES('C1782659074174','ADU/007/V/2026','U001','Budi Santoso','3201012345678901','sistem','aplikasinya eror','karena lupa sandi','submitted',NULL,NULL,'2026-06-28T15:04:34.178Z','2026-06-28T15:04:34.178Z',NULL,NULL,NULL,NULL);
INSERT INTO `complaints` VALUES('C1782659074995','ADU/008/V/2026','U001','Budi Santoso','3201012345678901','sistem','aplikasinya eror','karena lupa sandi','reviewing',NULL,NULL,'2026-06-28T15:04:34.997Z','2026-06-28T15:05:56.548Z','OFF003','Aipda. Rini Kusuma','SUPERADMIN','2026-06-28T15:05:56.548Z');
CREATE TABLE info_articles (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      description VARCHAR(255) NOT NULL,
      content VARCHAR(255) NOT NULL,
      published_at VARCHAR(255) NOT NULL
    );
INSERT INTO `info_articles` VALUES('1','Cara Membuat Laporan Polisi Online','Panduan','Panduan lengkap membuat laporan polisi melalui sistem SPKT Digital','SPKT Digital kini memungkinkan masyarakat melaporkan tindak pidana tanpa harus datang ke kantor polisi terlebih dahulu. Layanan ini dirancang untuk mempercepat proses penerimaan laporan dan memberikan nomor referensi resmi yang dapat dilacak secara online.

Langkah pertama, pastikan Anda sudah login ke akun SPKT Digital. Jika belum memiliki akun, daftar terlebih dahulu dengan melengkapi NIK dan data diri yang valid.

Selanjutnya, buka menu Buat Laporan. Isi data pelapor (nama, NIK, nomor telepon), pilih jenis kasus, tanggal kejadian, lokasi, serta uraian kejadian secara detail dan jujur. Anda dapat melampirkan foto atau dokumen pendukung sebagai bukti.

Setelah menekan Kirim Laporan, sistem akan menerbitkan nomor laporan resmi. Simpan nomor tersebut dan pantau perkembangannya melalui menu Laporan Saya. Petugas SPKT akan memverifikasi laporan Anda dan memberi notifikasi setiap kali status berubah.

Apabila formulir belum selesai, gunakan fitur Simpan Draft agar dapat melanjutkan pengisian di lain waktu.','2026-05-15');
INSERT INTO `info_articles` VALUES('2','Persyaratan Pembuatan SKCK','Layanan','Dokumen dan persyaratan yang diperlukan untuk mengajukan SKCK','Surat Keterangan Catatan Kepolisian (SKCK) diperlukan untuk berbagai keperluan administrasi, mulai dari melamar pekerjaan hingga pengurusan dokumen resmi.

Persyaratan yang harus disiapkan:
• Fotokopi KTP yang masih berlaku
• Pas foto terbaru berwarna ukuran 3x4 (2 lembar)
• Surat pengantar dari instansi/pemohon (jika diperlukan)
• Mengisi formulir permohonan secara lengkap

Pengajuan dilakukan melalui menu Layanan Surat → pilih SKCK. Unggah seluruh dokumen persyaratan, isi tujuan permohonan, dan tentukan tanggal rencana pengambilan jika tersedia.

Proses verifikasi memakan waktu 3–7 hari kerja setelah dokumen dinyatakan lengkap. Anda akan menerima notifikasi ketika SKCK siap diambil di kantor polisi setempat dengan membawa identitas asli.','2026-05-10');
INSERT INTO `info_articles` VALUES('3','Tips Keamanan Berkendara','Edukasi','Tips dan trik berkendara aman di jalan raya','Keselamatan berkendara menjadi tanggung jawab setiap pengguna jalan. Polri mengimbau masyarakat untuk selalu menerapkan prinsip defensive driving demi mengurangi risiko kecelakaan lalu lintas.

Sebelum berangkat, periksa kondisi kendaraan: rem, lampu, tekanan ban, dan kelengkapan SIM/STNK. Pastikan pengemudi dalam kondisi fit — hindari berkendara saat mengantuk atau setelah mengonsumsi alkohol.

Selama di jalan, patuhi rambu lalu lintas dan batas kecepatan. Gunakan helm standar SNI untuk pengendara motor dan sabuk pengaman untuk penumpang mobil. Hindari menggunakan ponsel saat mengemudi.

Jika terjadi kecelakaan atau pelanggaran, segera amankan lokasi kejadian dan laporkan melalui SPKT Digital atau hubungi hotline 110 apabila ada korban yang memerlukan pertolongan darurat.','2026-05-08');
INSERT INTO `info_articles` VALUES('4','Waspadai Modus Penipuan Online','Peringatan','Kenali dan hindari berbagai modus penipuan online terbaru','Polri mencatat peningkatan laporan penipuan online dalam beberapa bulan terakhir. Modus yang paling sering dilaporkan meliputi penipuan jual-beli barang fiktif, investasi bodong, dan pencurian identitas melalui tautan phishing.

Ciri-ciri penipuan yang perlu diwaspadai:
• Penjual menawarkan harga jauh di bawah pasaran dan meminta transfer di muka
• Tawaran investasi dengan imbal hasil tidak masuk akal dalam waktu singkat
• Pesan berisi tautan login bank/pajak yang meminta OTP atau password
• Akun media sosial palsu mengaku petugas kepolisian

Jangan pernah mentransfer uang ke rekening tidak dikenal sebelum barang/jasa terbukti nyata. Verifikasi identitas lawan transaksi dan laporkan dugaan penipuan segera melalui menu Buat Laporan atau Pengaduan di SPKT Digital agar dapat ditindaklanjuti petugas.','2026-05-05');
INSERT INTO `info_articles` VALUES('5','Prosedur Kehilangan KTP dan SIM','Panduan','Langkah-langkah yang harus dilakukan saat kehilangan dokumen penting','Kehilangan KTP atau SIM harus segera ditangani agar dokumen tersebut tidak disalahgunakan pihak tidak bertanggung jawab.

Langkah yang disarankan:
1. Buat laporan kehilangan resmi melalui SPKT Digital (menu Buat Laporan, jenis kehilangan dokumen) atau datang langsung ke SPKT terdekat.
2. Simpan nomor laporan kehilangan sebagai syarat penggantian dokumen.
3. Ajukan surat keterangan kehilangan melalui menu Layanan Surat jika diperlukan instansi terkait.
4. Proses penggantian KTP di Dukcapil dan SIM di Satpas Polri dengan membawa laporan kehilangan dan identitas pendukung lain.

Waktu pengurusan penggantian dokumen bervariasi tergantung antrian di instansi masing-masing. Segera laporkan kehilangan maksimal 1x24 jam setelah mengetahui dokumen hilang.','2026-05-01');
CREATE TABLE letter_attachments (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      letter_id VARCHAR(255) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      FOREIGN KEY (letter_id) REFERENCES letter_requests(id) ON DELETE CASCADE
    );
INSERT INTO `letter_attachments` VALUES(1,'L1782655369356','U001_1782655369073_408c2ad1_Cuplikan_layar_2026-06-14_101814.png');
INSERT INTO `letter_attachments` VALUES(2,'L1782657451463','U001_1782657449564_1005e34a_Cuplikan_layar_2026-06-14_100021.png');
CREATE TABLE letter_requests (
      id VARCHAR(100) PRIMARY KEY,
      request_number VARCHAR(255) NOT NULL UNIQUE,
      requester_user_id VARCHAR(100),
      requester_name VARCHAR(255) NOT NULL,
      requester_nik VARCHAR(255) NOT NULL,
      letter_type VARCHAR(255) NOT NULL,
      purpose VARCHAR(255) NOT NULL,
      status VARCHAR(255) NOT NULL DEFAULT 'submitted',
      pickup_date VARCHAR(100),
      created_at VARCHAR(255) NOT NULL, rejection_reason LONGTEXT, updated_at VARCHAR(100), requester_phone LONGTEXT, assigned_officer_id VARCHAR(100), assigned_to LONGTEXT, assigned_by LONGTEXT, assigned_at VARCHAR(100),
      FOREIGN KEY (requester_user_id) REFERENCES users(id)
    );
INSERT INTO `letter_requests` VALUES('L001','SKCK/001/V/2026','U001','Budi Santoso','3201012345678901','SKCK','Melamar pekerjaan','ready','2026-05-22T00:00:00','2026-05-15T10:00:00',NULL,'2026-05-15T10:00:00',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `letter_requests` VALUES('L002','SKH/002/V/2026','U001','Budi Santoso','3201012345678901','Surat Keterangan Kehilangan','Penggantian SIM','ready','2026-07-05','2026-05-18T14:00:00',NULL,'2026-06-28T13:27:02.563Z',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `letter_requests` VALUES('L1782655369356','IZIN/001/V/2026','U001','Budi Santoso','3201012345678901','Izin Keramaian','kondangan','submitted','2026-07-30','2026-06-28T14:02:49.359Z',NULL,'2026-06-28T14:02:49.359Z','081234567890',NULL,NULL,NULL,NULL);
INSERT INTO `letter_requests` VALUES('L1782657451463','SKCK/002/V/2026','U001','tri','3201012345678901','SKCK (Surat Keterangan Catatan Kepolisian)','m bbjbjnlmnm','submitted','2026-07-10','2026-06-28T14:37:31.465Z',NULL,'2026-06-28T14:37:31.465Z','081234567890',NULL,NULL,NULL,NULL);
CREATE TABLE letter_timeline (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      letter_id VARCHAR(255) NOT NULL,
      status VARCHAR(255) NOT NULL,
      timestamp VARCHAR(255) NOT NULL,
      note LONGTEXT,
      officer LONGTEXT,
      FOREIGN KEY (letter_id) REFERENCES letter_requests(id) ON DELETE CASCADE
    );
INSERT INTO `letter_timeline` VALUES(1,'L001','Pengajuan dibuat','2026-05-15T10:00:00',NULL,NULL);
INSERT INTO `letter_timeline` VALUES(2,'L002','Pengajuan dibuat','2026-05-18T14:00:00',NULL,NULL);
INSERT INTO `letter_timeline` VALUES(3,'L002','Siap diambil','2026-06-28T13:27:02.563Z',NULL,'Ipda. Ahmad Wijaya');
INSERT INTO `letter_timeline` VALUES(4,'L1782655369356','Pengajuan dikirim','2026-06-28T14:02:49.359Z',NULL,NULL);
INSERT INTO `letter_timeline` VALUES(5,'L1782657451463','Pengajuan dikirim','2026-06-28T14:37:31.465Z',NULL,NULL);
CREATE TABLE notifications (
      id VARCHAR(100) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message VARCHAR(255) NOT NULL,
      link LONGTEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at VARCHAR(255) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
INSERT INTO `notifications` VALUES('N1781415691787jyhz','U001','report_status','Status Laporan Diperbarui','Laporan LP/005/V/2026 sekarang: Diverifikasi','my-reports',0,'2026-06-14T05:41:31.787Z');
INSERT INTO `notifications` VALUES('N1781415699629ozhe','U001','report_status','Status Laporan Diperbarui','Laporan LP/005/V/2026 sekarang: Ditugaskan','my-reports',1,'2026-06-14T05:41:39.629Z');
INSERT INTO `notifications` VALUES('N1781415713251zvgk','U001','report_status','Status Laporan Diperbarui','Laporan LP/005/V/2026 sekarang: Diproses','my-reports',0,'2026-06-14T05:41:53.252Z');
INSERT INTO `notifications` VALUES('N17814157218336o1v','U001','report_status','Status Laporan Diperbarui','Laporan LP/005/V/2026 sekarang: Selesai','my-reports',1,'2026-06-14T05:42:01.833Z');
INSERT INTO `notifications` VALUES('N17826531359621jnl','U001','report_status','Status Laporan Diperbarui','Laporan LP/001/V/2026 sekarang: Diverifikasi','my-reports',0,'2026-06-28T13:25:35.962Z');
INSERT INTO `notifications` VALUES('N1782653141578sgiu','U001','report_status','Status Laporan Diperbarui','Laporan LP/001/V/2026 sekarang: Ditugaskan','my-reports',0,'2026-06-28T13:25:41.578Z');
INSERT INTO `notifications` VALUES('N1782653188421o9hx','U001','report_status','Status Laporan Diperbarui','Laporan LP/001/V/2026 sekarang: Diproses','my-reports',0,'2026-06-28T13:26:28.421Z');
INSERT INTO `notifications` VALUES('N1782653201312byhq','U001','report_status','Status Laporan Diperbarui','Laporan LP/001/V/2026 sekarang: Selesai','my-reports',0,'2026-06-28T13:26:41.312Z');
INSERT INTO `notifications` VALUES('N1782653222566ri9z','U001','letter_status','Status Surat Diperbarui','Pengajuan SKH/002/V/2026: Siap diambil','letter-service',0,'2026-06-28T13:27:02.566Z');
INSERT INTO `notifications` VALUES('N17826553158613v82','U001','report_status','Status Laporan Diperbarui','Laporan LP/002/V/2026 sekarang: Ditugaskan','my-reports',0,'2026-06-28T14:01:55.861Z');
INSERT INTO `notifications` VALUES('N17826563502121nrc','U001','report_status','Status Laporan Diperbarui','Laporan LP/003/V/2026 sekarang: Ditugaskan','my-reports',0,'2026-06-28T14:19:10.212Z');
INSERT INTO `notifications` VALUES('N1782656407266wlpx','U001','report_status','Status Laporan Diperbarui','Laporan LP/003/V/2026 sekarang: Diproses','my-reports',0,'2026-06-28T14:20:07.266Z');
INSERT INTO `notifications` VALUES('N1782656504879vdcw','U001','report_status','Status Laporan Diperbarui','Laporan LP/003/V/2026 sekarang: Selesai','my-reports',0,'2026-06-28T14:21:44.879Z');
INSERT INTO `notifications` VALUES('N1782657083537n9vp','U001','complaint_update','Pengaduan Ditanggapi','Pengaduan ADU/006/V/2026 telah diperbarui','complaints',0,'2026-06-28T14:31:23.537Z');
INSERT INTO `notifications` VALUES('N1782657095346aivj','U001','complaint_update','Pengaduan Ditanggapi','Pengaduan ADU/006/V/2026 telah diperbarui','complaints',0,'2026-06-28T14:31:35.346Z');
INSERT INTO `notifications` VALUES('N17826571014033f89','U001','complaint_update','Pengaduan Ditanggapi','Pengaduan ADU/006/V/2026 telah diperbarui','complaints',0,'2026-06-28T14:31:41.403Z');
INSERT INTO `notifications` VALUES('N1782658298365emvc','U001','report_status','Status Laporan Diperbarui','Laporan LP/002/V/2026 sekarang: Diproses','my-reports',0,'2026-06-28T14:51:38.365Z');
INSERT INTO `notifications` VALUES('N1782659156552sjwi','U001','complaint_update','Pengaduan Ditanggapi','Pengaduan ADU/008/V/2026 telah diperbarui','complaints',0,'2026-06-28T15:05:56.552Z');
CREATE TABLE officers (
      id VARCHAR(100) PRIMARY KEY,
      user_id VARCHAR(100),
      name VARCHAR(255) NOT NULL,
      rank VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(255) NOT NULL,
      status VARCHAR(255) NOT NULL DEFAULT 'available', division VARCHAR(255) NOT NULL DEFAULT 'laporan',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
INSERT INTO `officers` VALUES('OFF001','U002','Ipda. Ahmad Wijaya','Inspektur Polisi Dua','petugas@spkt.id','081234567890','available','laporan');
INSERT INTO `officers` VALUES('OFF002','U004','Bripka. Andi Pratama','Brigadir Polisi Kepala','petugas-surat@spkt.id','081234567891','available','surat');
INSERT INTO `officers` VALUES('OFF003','U005','Aipda. Rini Kusuma','Ajun Inspektur Polisi Dua','petugas-pengaduan@spkt.id','081234567892','available','pengaduan');
CREATE TABLE pending_2fa (
      token VARCHAR(100) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      expires_at VARCHAR(255) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
CREATE TABLE reference_counters (
      prefix VARCHAR(255) NOT NULL,
      year INTEGER NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (prefix, year)
    );
INSERT INTO `reference_counters` VALUES('LP',2026,6);
INSERT INTO `reference_counters` VALUES('ADU',2026,11);
INSERT INTO `reference_counters` VALUES('SKCK',2026,5);
INSERT INTO `reference_counters` VALUES('SKH',2026,2);
INSERT INTO `reference_counters` VALUES('IZIN',2026,1);
INSERT INTO `reference_counters` VALUES('SKR',2026,0);
CREATE TABLE report_evidence (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      report_id VARCHAR(255) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );
INSERT INTO `report_evidence` VALUES(7,'R1782653106649','U001_1782653106343_ac7f9e42_Cuplikan_layar_2026-06-14_100017.png');
INSERT INTO `report_evidence` VALUES(8,'R1782655234803','U001_1782655234493_19cc0ccd_Cuplikan_layar_2026-06-14_101814.png');
INSERT INTO `report_evidence` VALUES(9,'R1782656300278','U001_1782656298331_89a0b4db_Cuplikan_layar_2026-06-14_101814.png');
CREATE TABLE report_timeline (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      report_id VARCHAR(255) NOT NULL,
      status VARCHAR(255) NOT NULL,
      timestamp VARCHAR(255) NOT NULL,
      note LONGTEXT,
      officer LONGTEXT,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );
INSERT INTO `report_timeline` VALUES(30,'R1782653106649','Laporan dikirim','2026-06-28T13:25:06.649Z',NULL,NULL);
INSERT INTO `report_timeline` VALUES(31,'R1782653106649','Diverifikasi','2026-06-28T13:25:35.960Z',NULL,'Ipda. Ahmad Wijaya');
INSERT INTO `report_timeline` VALUES(32,'R1782653106649','Ditugaskan','2026-06-28T13:25:41.574Z',NULL,'Ipda. Ahmad Wijaya');
INSERT INTO `report_timeline` VALUES(33,'R1782653106649','Diproses','2026-06-28T13:26:28.418Z','SEDANG DI AWASI ','Ipda. Ahmad Wijaya');
INSERT INTO `report_timeline` VALUES(34,'R1782653106649','Selesai','2026-06-28T13:26:41.308Z','SUDAH DI CEK AMAN','Ipda. Ahmad Wijaya');
INSERT INTO `report_timeline` VALUES(35,'R1782655234803','Laporan dikirim','2026-06-28T14:00:34.803Z',NULL,NULL);
INSERT INTO `report_timeline` VALUES(36,'R1782655234803','Ditugaskan','2026-06-28T14:01:55.857Z','Ditugaskan ke petugas','SUPERADMIN');
INSERT INTO `report_timeline` VALUES(37,'R1782655234803','Ditugaskan','2026-06-28T14:01:55.867Z','Ditugaskan ke petugas','SUPERADMIN');
INSERT INTO `report_timeline` VALUES(38,'R1782656300278','Laporan dikirim','2026-06-28T14:18:20.278Z',NULL,NULL);
INSERT INTO `report_timeline` VALUES(39,'R1782656300278','Ditugaskan','2026-06-28T14:19:10.210Z','Ditugaskan ke petugas','SUPERADMIN');
INSERT INTO `report_timeline` VALUES(40,'R1782656300278','Diproses','2026-06-28T14:20:07.263Z','ok','Ipda. Ahmad Wijaya');
INSERT INTO `report_timeline` VALUES(41,'R1782656300278','Selesai','2026-06-28T14:21:44.875Z',NULL,'Ipda. Ahmad Wijaya');
INSERT INTO `report_timeline` VALUES(42,'R1782655234803','Diproses','2026-06-28T14:51:38.363Z','cari orangnya','Ipda. Ahmad Wijaya');
INSERT INTO `report_timeline` VALUES(43,'R1782655234803','Diproses','2026-06-28T14:51:39.351Z','cari orangnya','Ipda. Ahmad Wijaya');
CREATE TABLE reports (
      id VARCHAR(100) PRIMARY KEY,
      report_number VARCHAR(255) NOT NULL UNIQUE,
      reporter_user_id VARCHAR(100),
      reporter_name VARCHAR(255) NOT NULL,
      reporter_nik VARCHAR(255) NOT NULL,
      reporter_phone VARCHAR(255) NOT NULL,
      case_type VARCHAR(255) NOT NULL,
      incident_date VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      description VARCHAR(255) NOT NULL,
      status VARCHAR(255) NOT NULL DEFAULT 'submitted',
      priority LONGTEXT DEFAULT 'medium',
      assigned_to LONGTEXT,
      assigned_by LONGTEXT,
      assigned_at VARCHAR(100),
      notes LONGTEXT,
      created_at VARCHAR(255) NOT NULL,
      updated_at VARCHAR(255) NOT NULL, assigned_officer_id VARCHAR(100),
      FOREIGN KEY (reporter_user_id) REFERENCES users(id)
    );
INSERT INTO `reports` VALUES('R1782653106649','LP/001/V/2026','U001','Budi Santoso','3201012345678901','081234567890','Narkoba','2026-06-27','jl pulo melati 6','OKE','completed','medium','Ipda. Ahmad Wijaya','Ipda. Ahmad Wijaya','2026-06-28T13:25:41.574Z',NULL,'2026-06-28T13:25:06.649Z','2026-06-28T13:26:41.308Z','OFF001');
INSERT INTO `reports` VALUES('R1782655234803','LP/002/V/2026','U001','Budi Santoso','3201012345678901','081234567890','Penipuan','2026-06-27','jl pulo melati 6','oke','processing','medium','Ipda. Ahmad Wijaya','SUPERADMIN','2026-06-28T14:01:55.867Z',NULL,'2026-06-28T14:00:34.803Z','2026-06-28T14:51:39.351Z','OFF001');
INSERT INTO `reports` VALUES('R1782656300278','LP/003/V/2026','U001','Budi Sant','3201012345678901','081234567890','','2026-06-05','jl pulo melati 6','ik','completed','medium','Ipda. Ahmad Wijaya','SUPERADMIN','2026-06-28T14:19:10.210Z',NULL,'2026-06-28T14:18:20.278Z','2026-06-28T14:21:44.875Z','OFF001');
CREATE TABLE satisfaction_surveys (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      user_id VARCHAR(100),
      user_name VARCHAR(255) NOT NULL,
      user_email LONGTEXT,
      service_type VARCHAR(255) NOT NULL,
      service_label LONGTEXT,
      reference_id VARCHAR(100),
      comment LONGTEXT,
      csi_score REAL NOT NULL,
      submitted_at VARCHAR(255) NOT NULL DEFAULT (datetime('now'))
    );
INSERT INTO `satisfaction_surveys` VALUES(1,'U001','Budi Santoso','user@spkt.id','complaint','Pengaduan','ADU/001/V/2026','oke',75.0,'2026-06-14 05:38:32');
INSERT INTO `satisfaction_surveys` VALUES(2,'U001','Budi Santoso','user@spkt.id','report','Buat Laporan','LP/005/V/2026',NULL,85.0,'2026-06-14 05:43:42');
CREATE TABLE sessions (
      id VARCHAR(100) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      expires_at VARCHAR(255) NOT NULL,
      created_at VARCHAR(255) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
INSERT INTO `sessions` VALUES('ae642082-7df4-43ee-8e60-35a2e5b22ffb','U001','2026-07-05T12:44:17.475Z','2026-06-28T12:44:17.475Z');
INSERT INTO `sessions` VALUES('99441645-ff1f-4c3f-93a4-84ce196b5171','U001','2026-07-05T12:46:36.451Z','2026-06-28T12:46:36.451Z');
INSERT INTO `sessions` VALUES('46ca51ab-f9dc-4666-afb0-96ca87fc70d8','U001','2026-07-05T12:46:41.202Z','2026-06-28T12:46:41.202Z');
INSERT INTO `sessions` VALUES('691cfbb6-b427-42c4-9104-4f2826ddf62c','U001','2026-07-05T12:52:15.233Z','2026-06-28T12:52:15.233Z');
INSERT INTO `sessions` VALUES('803b137b-bd0f-4f72-82fb-4ff3adadc454','U001','2026-07-05T12:54:53.798Z','2026-06-28T12:54:53.798Z');
INSERT INTO `sessions` VALUES('3490d23c-b709-486e-8a4a-9dbcc3f6d879','U001','2026-07-05T12:57:15.505Z','2026-06-28T12:57:15.504Z');
INSERT INTO `sessions` VALUES('e59413a6-79f7-465e-ae4c-06ea068b4acc','U001','2026-07-05T15:12:59.676Z','2026-06-28T15:12:59.676Z');
CREATE TABLE survey_dimensions (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      code VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      weight REAL NOT NULL DEFAULT 1
    );
INSERT INTO `survey_dimensions` VALUES(1,'ease','Kemudahan Prosedur',1.0);
INSERT INTO `survey_dimensions` VALUES(2,'speed','Kecepatan Pelayanan',1.0);
INSERT INTO `survey_dimensions` VALUES(3,'officer','Keramahan Petugas',1.0);
INSERT INTO `survey_dimensions` VALUES(4,'clarity','Kejelasan Informasi',1.0);
INSERT INTO `survey_dimensions` VALUES(5,'quality','Kualitas Hasil Layanan',1.0);
CREATE TABLE survey_responses (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      survey_id INTEGER NOT NULL,
      dimension_id INTEGER NOT NULL,
      score INTEGER NOT NULL CHECK(score >= 1 AND score <= 4),
      FOREIGN KEY (survey_id) REFERENCES satisfaction_surveys(id) ON DELETE CASCADE,
      FOREIGN KEY (dimension_id) REFERENCES survey_dimensions(id),
      UNIQUE(survey_id, dimension_id)
    );
INSERT INTO `survey_responses` VALUES(1,1,1,3);
INSERT INTO `survey_responses` VALUES(2,1,2,3);
INSERT INTO `survey_responses` VALUES(3,1,3,3);
INSERT INTO `survey_responses` VALUES(4,1,4,3);
INSERT INTO `survey_responses` VALUES(5,1,5,3);
INSERT INTO `survey_responses` VALUES(6,2,1,3);
INSERT INTO `survey_responses` VALUES(7,2,2,3);
INSERT INTO `survey_responses` VALUES(8,2,3,3);
INSERT INTO `survey_responses` VALUES(9,2,4,4);
INSERT INTO `survey_responses` VALUES(10,2,5,4);
CREATE TABLE user_activities (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      user_id VARCHAR(255) NOT NULL,
      action VARCHAR(255) NOT NULL,
      details LONGTEXT,
      created_at VARCHAR(255) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
INSERT INTO `user_activities` VALUES(1,'U001','login',NULL,'2026-06-14T07:24:32.101Z');
INSERT INTO `user_activities` VALUES(2,'U002','login',NULL,'2026-06-14T07:30:05.736Z');
INSERT INTO `user_activities` VALUES(3,'U003','login',NULL,'2026-06-14T07:30:49.025Z');
INSERT INTO `user_activities` VALUES(4,'U003','login',NULL,'2026-06-14T07:31:58.799Z');
INSERT INTO `user_activities` VALUES(5,'U003','login',NULL,'2026-06-14T07:33:24.222Z');
INSERT INTO `user_activities` VALUES(6,'U001','login',NULL,'2026-06-14T07:53:04.673Z');
INSERT INTO `user_activities` VALUES(7,'U002','login',NULL,'2026-06-14T07:53:23.267Z');
INSERT INTO `user_activities` VALUES(8,'U001','login',NULL,'2026-06-28T12:44:17.476Z');
INSERT INTO `user_activities` VALUES(9,'U001','login',NULL,'2026-06-28T12:46:36.459Z');
INSERT INTO `user_activities` VALUES(10,'U001','create_report','LP/007/V/2026','2026-06-28T12:46:37.597Z');
INSERT INTO `user_activities` VALUES(11,'U001','login',NULL,'2026-06-28T12:46:41.221Z');
INSERT INTO `user_activities` VALUES(12,'U001','create_report','LP/008/V/2026','2026-06-28T12:46:59.298Z');
INSERT INTO `user_activities` VALUES(13,'U001','login',NULL,'2026-06-28T12:52:15.238Z');
INSERT INTO `user_activities` VALUES(14,'U001','create_report','LP/009/V/2026','2026-06-28T12:52:16.057Z');
INSERT INTO `user_activities` VALUES(15,'U001','login',NULL,'2026-06-28T12:54:53.807Z');
INSERT INTO `user_activities` VALUES(16,'U001','create_report','LP/010/V/2026','2026-06-28T12:54:54.330Z');
INSERT INTO `user_activities` VALUES(17,'U001','create_report','LP/011/V/2026','2026-06-28T12:54:55.188Z');
INSERT INTO `user_activities` VALUES(18,'U001','login',NULL,'2026-06-28T12:56:32.964Z');
INSERT INTO `user_activities` VALUES(19,'U001','login',NULL,'2026-06-28T12:57:15.517Z');
INSERT INTO `user_activities` VALUES(20,'U001','create_report','LP/012/V/2026','2026-06-28T12:57:15.977Z');
INSERT INTO `user_activities` VALUES(21,'U002','login',NULL,'2026-06-28T13:02:52.569Z');
INSERT INTO `user_activities` VALUES(22,'U003','login',NULL,'2026-06-28T13:07:37.696Z');
INSERT INTO `user_activities` VALUES(23,'U002','login',NULL,'2026-06-28T13:08:49.694Z');
INSERT INTO `user_activities` VALUES(24,'U003','login',NULL,'2026-06-28T13:13:37.482Z');
INSERT INTO `user_activities` VALUES(25,'U001','login',NULL,'2026-06-28T13:22:23.539Z');
INSERT INTO `user_activities` VALUES(26,'U002','login',NULL,'2026-06-28T13:24:30.739Z');
INSERT INTO `user_activities` VALUES(27,'U001','login',NULL,'2026-06-28T13:24:41.389Z');
INSERT INTO `user_activities` VALUES(28,'U001','create_report','LP/001/V/2026','2026-06-28T13:25:06.657Z');
INSERT INTO `user_activities` VALUES(29,'U002','login',NULL,'2026-06-28T13:25:14.928Z');
INSERT INTO `user_activities` VALUES(30,'U003','login',NULL,'2026-06-28T13:28:57.695Z');
INSERT INTO `user_activities` VALUES(31,'U004','login',NULL,'2026-06-28T13:51:54.906Z');
INSERT INTO `user_activities` VALUES(32,'U002','login',NULL,'2026-06-28T13:52:10.090Z');
INSERT INTO `user_activities` VALUES(33,'U005','login',NULL,'2026-06-28T13:52:27.088Z');
INSERT INTO `user_activities` VALUES(34,'U004','login',NULL,'2026-06-28T13:52:35.518Z');
INSERT INTO `user_activities` VALUES(35,'U001','login',NULL,'2026-06-28T13:52:41.432Z');
INSERT INTO `user_activities` VALUES(36,'U001','login',NULL,'2026-06-28T13:58:53.109Z');
INSERT INTO `user_activities` VALUES(37,'U001','login',NULL,'2026-06-28T13:59:57.957Z');
INSERT INTO `user_activities` VALUES(38,'U001','create_report','LP/002/V/2026','2026-06-28T14:00:34.811Z');
INSERT INTO `user_activities` VALUES(39,'U002','login',NULL,'2026-06-28T14:00:42.792Z');
INSERT INTO `user_activities` VALUES(40,'U001','login',NULL,'2026-06-28T14:00:56.760Z');
INSERT INTO `user_activities` VALUES(41,'U002','login',NULL,'2026-06-28T14:01:03.048Z');
INSERT INTO `user_activities` VALUES(42,'U004','login',NULL,'2026-06-28T14:01:12.114Z');
INSERT INTO `user_activities` VALUES(43,'U005','login',NULL,'2026-06-28T14:01:16.943Z');
INSERT INTO `user_activities` VALUES(44,'U004','login',NULL,'2026-06-28T14:01:21.929Z');
INSERT INTO `user_activities` VALUES(45,'U003','login',NULL,'2026-06-28T14:01:27.128Z');
INSERT INTO `user_activities` VALUES(46,'U002','login',NULL,'2026-06-28T14:02:13.188Z');
INSERT INTO `user_activities` VALUES(47,'U001','login',NULL,'2026-06-28T14:02:27.194Z');
INSERT INTO `user_activities` VALUES(48,'U001','create_letter','IZIN/001/V/2026','2026-06-28T14:02:49.362Z');
INSERT INTO `user_activities` VALUES(49,'U004','login',NULL,'2026-06-28T14:02:58.041Z');
INSERT INTO `user_activities` VALUES(50,'U005','login',NULL,'2026-06-28T14:03:01.442Z');
INSERT INTO `user_activities` VALUES(51,'U003','login',NULL,'2026-06-28T14:03:08.743Z');
INSERT INTO `user_activities` VALUES(52,'U003','login',NULL,'2026-06-28T14:07:35.573Z');
INSERT INTO `user_activities` VALUES(53,'U003','login',NULL,'2026-06-28T14:10:06.484Z');
INSERT INTO `user_activities` VALUES(54,'U001','login',NULL,'2026-06-28T14:11:51.309Z');
INSERT INTO `user_activities` VALUES(55,'U003','login',NULL,'2026-06-28T14:12:41.240Z');
INSERT INTO `user_activities` VALUES(56,'U003','login',NULL,'2026-06-28T14:13:09.547Z');
INSERT INTO `user_activities` VALUES(57,'U001','login',NULL,'2026-06-28T14:17:10.982Z');
INSERT INTO `user_activities` VALUES(58,'U001','create_report','LP/003/V/2026','2026-06-28T14:18:20.289Z');
INSERT INTO `user_activities` VALUES(59,'U002','login',NULL,'2026-06-28T14:18:33.502Z');
INSERT INTO `user_activities` VALUES(60,'U003','login',NULL,'2026-06-28T14:18:48.393Z');
INSERT INTO `user_activities` VALUES(61,'U002','login',NULL,'2026-06-28T14:19:17.319Z');
INSERT INTO `user_activities` VALUES(62,'U001','login',NULL,'2026-06-28T14:22:00.037Z');
INSERT INTO `user_activities` VALUES(63,'U003','login',NULL,'2026-06-28T14:23:01.354Z');
INSERT INTO `user_activities` VALUES(64,'U003','login',NULL,'2026-06-28T14:23:59.295Z');
INSERT INTO `user_activities` VALUES(65,'U001','login',NULL,'2026-06-28T14:24:29.747Z');
INSERT INTO `user_activities` VALUES(66,'U003','login',NULL,'2026-06-28T14:26:08.790Z');
INSERT INTO `user_activities` VALUES(67,'U001','login',NULL,'2026-06-28T14:28:43.323Z');
INSERT INTO `user_activities` VALUES(68,'U001','create_complaint','ADU/003/V/2026','2026-06-28T14:30:04.434Z');
INSERT INTO `user_activities` VALUES(69,'U001','create_complaint','ADU/004/V/2026','2026-06-28T14:30:04.494Z');
INSERT INTO `user_activities` VALUES(70,'U001','create_complaint','ADU/005/V/2026','2026-06-28T14:30:06.017Z');
INSERT INTO `user_activities` VALUES(71,'U001','create_complaint','ADU/006/V/2026','2026-06-28T14:30:06.533Z');
INSERT INTO `user_activities` VALUES(72,'U003','login',NULL,'2026-06-28T14:30:22.170Z');
INSERT INTO `user_activities` VALUES(73,'U005','login',NULL,'2026-06-28T14:30:51.539Z');
INSERT INTO `user_activities` VALUES(74,'U001','login',NULL,'2026-06-28T14:31:46.767Z');
INSERT INTO `user_activities` VALUES(75,'U004','login',NULL,'2026-06-28T14:33:03.812Z');
INSERT INTO `user_activities` VALUES(76,'U001','login',NULL,'2026-06-28T14:33:50.476Z');
INSERT INTO `user_activities` VALUES(77,'U001','create_letter','SKCK/002/V/2026','2026-06-28T14:37:31.468Z');
INSERT INTO `user_activities` VALUES(78,'U003','login',NULL,'2026-06-28T14:43:22.605Z');
INSERT INTO `user_activities` VALUES(79,'U002','login',NULL,'2026-06-28T14:49:19.483Z');
INSERT INTO `user_activities` VALUES(80,'U005','login',NULL,'2026-06-28T14:55:58.662Z');
INSERT INTO `user_activities` VALUES(81,'U001','login',NULL,'2026-06-28T14:56:26.756Z');
INSERT INTO `user_activities` VALUES(82,'U001','create_complaint','ADU/007/V/2026','2026-06-28T15:04:34.182Z');
INSERT INTO `user_activities` VALUES(83,'U001','create_complaint','ADU/008/V/2026','2026-06-28T15:04:35.001Z');
INSERT INTO `user_activities` VALUES(84,'U003','login',NULL,'2026-06-28T15:05:31.716Z');
INSERT INTO `user_activities` VALUES(85,'U005','login',NULL,'2026-06-28T15:06:23.918Z');
INSERT INTO `user_activities` VALUES(86,'U001','login',NULL,'2026-06-28T15:12:59.678Z');

INSERT INTO `users` VALUES('U001','user@spkt.id','scrypt:618a98596a3963d84daaba4d3e372818:188c9e78ac90a39e008ac1296bec148e88255682f847535e9093baca42c6d926aaa1bb2f29803a4142c809e509a6a96d66fd2a77f9e16bf655c2d4c16f35f4fd','Budi Santoso','3201012345678901','081234567890','user',1,NULL,NULL,'{"email":true,"push":true,"sms":false,"reportUpdate":true,"letterReady":true,"systemNews":false,"darkMode":true}',NULL,0);
INSERT INTO `users` VALUES('U002','petugas@spkt.id','scrypt:618a98596a3963d84daaba4d3e372818:188c9e78ac90a39e008ac1296bec148e88255682f847535e9093baca42c6d926aaa1bb2f29803a4142c809e509a6a96d66fd2a77f9e16bf655c2d4c16f35f4fd','Ipda. Ahmad Wijaya',NULL,'081234567890','petugas',1,NULL,'U002_1782651961670_3916ab93_Cuplikan_layar_2026-06-14_101814.png','{"email":true,"push":true,"sms":false,"reportUpdate":true,"letterReady":true,"systemNews":false,"darkMode":true}',NULL,0);
INSERT INTO `users` VALUES('U003','admin@spkt.id','scrypt:618a98596a3963d84daaba4d3e372818:188c9e78ac90a39e008ac1296bec148e88255682f847535e9093baca42c6d926aaa1bb2f29803a4142c809e509a6a96d66fd2a77f9e16bf655c2d4c16f35f4fd','Kompol. Sarah Putri',NULL,'','admin',1,'',NULL,'{"email":true,"push":true,"sms":true,"reportUpdate":true,"letterReady":true,"systemNews":true,"publicProfile":false,"activityHistory":true}',NULL,0);
INSERT INTO `users` VALUES('U004','petugas-surat@spkt.id','scrypt:618a98596a3963d84daaba4d3e372818:188c9e78ac90a39e008ac1296bec148e88255682f847535e9093baca42c6d926aaa1bb2f29803a4142c809e509a6a96d66fd2a77f9e16bf655c2d4c16f35f4fd','Bripka. Andi Pratama',NULL,'081234567891','petugas',1,NULL,NULL,'{}',NULL,0);
INSERT INTO `users` VALUES('U005','petugas-pengaduan@spkt.id','scrypt:618a98596a3963d84daaba4d3e372818:188c9e78ac90a39e008ac1296bec148e88255682f847535e9093baca42c6d926aaa1bb2f29803a4142c809e509a6a96d66fd2a77f9e16bf655c2d4c16f35f4fd','Aipda. Rini Kusuma',NULL,'081234567892','petugas',1,NULL,NULL,'{}',NULL,0);
CREATE INDEX idx_surveys_service ON satisfaction_surveys(service_type);
CREATE INDEX idx_surveys_submitted ON satisfaction_surveys(submitted_at);
CREATE INDEX idx_reports_nik ON reports(reporter_nik);
CREATE INDEX idx_reports_assigned ON reports(assigned_to);
CREATE INDEX idx_letters_nik ON letter_requests(requester_nik);
CREATE INDEX idx_complaints_nik ON complaints(submitter_nik);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_user_activities_user ON user_activities(user_id, created_at);











COMMIT;
SET FOREIGN_KEY_CHECKS = 1;