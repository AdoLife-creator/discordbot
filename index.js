const {
  Client, GatewayIntentBits, Collection,
  ActivityType, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
  PermissionFlagsBits, ChannelType
} = require('discord.js');

const config = require('./config.js');

// ─────────────────────────────────────────────
//  CLIENT
// ─────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

let ticketSayac = 1;

// ─────────────────────────────────────────────
//  HAZIR
// ─────────────────────────────────────────────
client.once('ready', () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║       ARES PROJECT BOT HAZIR         ║`);
  console.log(`╠══════════════════════════════════════╣`);
  console.log(`║  Tag   : ${client.user.tag.padEnd(28)}║`);
  console.log(`║  Sürüm : ${config.version.padEnd(28)}║`);
  console.log(`║  Dev   : ${config.developer.padEnd(28)}║`);
  console.log(`╚══════════════════════════════════════╝\n`);

  // Streaming durumu
  client.user.setActivity('230 Müşteri Yorumu', {
    type: ActivityType.Streaming,
    url: 'https://twitch.tv/aresproject'
  });
});

// ─────────────────────────────────────────────
//  KATEGORİ BİLGİLERİ
// ─────────────────────────────────────────────
const kategoriler = {
  siparis: {
    label: 'Sipariş',
    emoji: '⭐',
    aciklama: 'Yeni bir sipariş vermek istiyorum',
    renk: 0xf1c40f
  },
  destek: {
    label: 'Destek',
    emoji: '🌟',
    aciklama: 'Bir sorunum var, yardım istiyorum',
    renk: 0xe74c3c
  },
  proje: {
    label: 'Proje İsteği',
    emoji: '💫',
    aciklama: 'Özel proje talebi oluşturmak istiyorum',
    renk: 0x9b59b6
  },
  ucretsiz: {
    label: 'Ücretsiz Proje Alma',
    emoji: '🌠',
    aciklama: 'Ücretsiz proje hakkında bilgi almak istiyorum',
    renk: 0x3498db
  },
  diger: {
    label: 'Diğer',
    emoji: '🎫',
    aciklama: 'Diğer konular hakkında',
    renk: 0x95a5a6
  }
};

// ─────────────────────────────────────────────
//  SELECT MENU (KATEGORİ SEÇ)
// ─────────────────────────────────────────────
function kategoriBildirgeciOlustur() {
  return new StringSelectMenuBuilder()
    .setCustomId('ticket_kategori')
    .setPlaceholder('🎫 Bir kategori seç...')
    .addOptions(
      Object.entries(kategoriler).map(([value, kat]) => ({
        label: kat.label,
        description: kat.aciklama,
        value,
        emoji: kat.emoji
      }))
    );
}

// ─────────────────────────────────────────────
//  TICKET BUTONLARI
// ─────────────────────────────────────────────
function ticketButonlari() {
  const ustlen = new ButtonBuilder()
    .setCustomId('ticket_ustlen')
    .setLabel('Üstlen')
    .setEmoji('✋')
    .setStyle(ButtonStyle.Primary);

  const kapat = new ButtonBuilder()
    .setCustomId('ticket_kapat')
    .setLabel('Ticketı Kapat')
    .setEmoji('🔒')
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder().addComponents(ustlen, kapat);
}

// ─────────────────────────────────────────────
//  SETUP KOMUTU → Destek Merkezi Embed
// ─────────────────────────────────────────────
async function handleSetup(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '❌ Bu komutu kullanmak için **Yönetici** yetkisi gerekli!',
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const embed = new EmbedBuilder()
    .setTitle('Destek Merkezi')
    .setColor(0x2b2d31)
    .addFields(
      {
        name: '🔧 Destek Merkezi Hakkında.',
        value: 'Aşağıdaki seçeneklerden uygun olanı seçerek hemen bir ticket oluşturabilirsiniz.'
      },
      {
        name: '❤️ Sunucu Bilgisi.',
        value: 'Gereksiz ticket açmayın, Sunucu Kurallarını Okumayı Unutmayın.'
      }
    )
    // Banner resminizin URL'ini aşağıya yazın:
    .setImage(config.bannerUrl || null)
    .setFooter({
      text: `${config.botName} • ${config.version}`,
      iconURL: client.user.displayAvatarURL()
    });

  const row = new ActionRowBuilder().addComponents(kategoriBildirgeciOlustur());

  await interaction.channel.send({ embeds: [embed], components: [row] });
  await interaction.editReply({ content: '✅ Destek Merkezi başarıyla kuruldu!' });
}

// ─────────────────────────────────────────────
//  TİCKET OLUŞTUR
// ─────────────────────────────────────────────
async function handleTicketOlustur(interaction) {
  const kategoriAdi = interaction.values[0];
  const kat = kategoriler[kategoriAdi];
  const guild = interaction.guild;
  const kullanici = interaction.user;

  // Zaten açık ticket var mı?
  const mevcutTicket = guild.channels.cache.find(
    c => c.topic && c.topic.includes(`sahibi:${kullanici.id}`) && c.topic.includes('acik:true')
  );

  if (mevcutTicket) {
    return interaction.reply({
      content: `❌ Zaten açık bir ticketın var: ${mevcutTicket}\nÖnce onu kapatman gerekiyor.`,
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  // Kanal adı
  const temizIsim = kullanici.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  const kanalAdi = `ticket-${String(ticketSayac).padStart(4, '0')}-${temizIsim}`;
  ticketSayac++;

  // İzinler
  const izinler = [
    {
      id: guild.roles.everyone,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: kullanici.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    }
  ];

  // Yetkili rolü varsa ekle
  if (config.yetkiliRolId) {
    izinler.push({
      id: config.yetkiliRolId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ManageChannels
      ]
    });
  }

  // Kanal oluştur
  const kanal = await guild.channels.create({
    name: kanalAdi,
    type: ChannelType.GuildText,
    parent: config.ticketKategoriId || null,
    topic: `sahibi:${kullanici.id} | kategori:${kategoriAdi} | acik:true`,
    permissionOverwrites: izinler
  });

  // Ticket embedi
  const ticketEmbed = new EmbedBuilder()
    .setTitle(`${kat.emoji} ${kat.label} Talebi`)
    .setColor(kat.renk)
    .setDescription(
      `Merhaba ${kullanici}! 👋\n\n` +
      `> **Kategori:** ${kat.emoji} ${kat.label}\n` +
      `> **Oluşturulma:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
      `📝 **Sorunuzu veya talebinizi detaylı şekilde anlatın.**\n` +
      `Ekibimiz en kısa sürede size yardımcı olacak!`
    )
    .setThumbnail(kullanici.displayAvatarURL({ dynamic: true }))
    .setFooter({
      text: `${config.botName} • ${config.version} • Geliştirici: ${config.developer}`,
      iconURL: client.user.displayAvatarURL()
    })
    .setTimestamp();

  const yetkiliMention = config.yetkiliRolId ? `<@&${config.yetkiliRolId}>` : '';
  await kanal.send({
    content: `${kullanici} ${yetkiliMention}`,
    embeds: [ticketEmbed],
    components: [ticketButonlari()]
  });

  await interaction.editReply({
    content: `✅ Ticketın oluşturuldu: ${kanal}`
  });

  // Log kanalına gönder
  await logGonder(guild, {
    renk: 0x2ecc71,
    baslik: '🎫 Yeni Ticket Açıldı',
    alanlar: [
      { name: '👤 Kullanıcı', value: `${kullanici.tag}\n(${kullanici.id})`, inline: true },
      { name: `${kat.emoji} Kategori`, value: kat.label, inline: true },
      { name: '📁 Kanal', value: `${kanal}`, inline: true }
    ]
  });
}

// ─────────────────────────────────────────────
//  TİCKET KAPAT
// ─────────────────────────────────────────────
async function handleKapat(interaction) {
  const kanal = interaction.channel;

  // Sadece ticket kanalında çalışsın
  if (!kanal.topic || !kanal.topic.includes('sahibi:')) {
    return interaction.reply({ content: '❌ Bu bir ticket kanalı değil!', ephemeral: true });
  }

  const kapatmaEmbed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setDescription(`🔒 Bu ticket **${interaction.user.tag}** tarafından kapatıldı.\n\`5 saniye içinde silinecek...\``)
    .setTimestamp();

  await interaction.reply({ embeds: [kapatmaEmbed] });

  // Konuyu güncelle
  await kanal.setTopic(kanal.topic.replace('acik:true', 'acik:false'));

  // Log
  const sahibiId = kanal.topic.match(/sahibi:(\d+)/)?.[1];
  await logGonder(interaction.guild, {
    renk: 0xe74c3c,
    baslik: '🔒 Ticket Kapatıldı',
    alanlar: [
      { name: '📁 Kanal', value: kanal.name, inline: true },
      { name: '🔨 Kapatan', value: `${interaction.user.tag}`, inline: true },
      { name: '👤 Ticket Sahibi', value: sahibiId ? `<@${sahibiId}>` : 'Bilinmiyor', inline: true }
    ]
  });

  setTimeout(async () => {
    await kanal.delete().catch(() => {});
  }, 5000);
}

// ─────────────────────────────────────────────
//  TİCKET ÜSTLEN
// ─────────────────────────────────────────────
async function handleUstlen(interaction) {
  const yetkili = interaction.user;

  // Yetki kontrolü
  if (config.yetkiliRolId) {
    const uyeRolleri = interaction.member.roles.cache;
    if (!uyeRolleri.has(config.yetkiliRolId) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Bu işlem için yetkili rolü gerekli!', ephemeral: true });
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setDescription(`✋ Bu ticket **${yetkili.tag}** tarafından üstlenildi.\nSorularınız için kendisine danışabilirsiniz.`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────
//  BOT BİLGİ KOMUTU
// ─────────────────────────────────────────────
async function handleBotInfo(interaction) {
  const uptimeSaniye = Math.floor(client.uptime / 1000);
  const saat = Math.floor(uptimeSaniye / 3600);
  const dakika = Math.floor((uptimeSaniye % 3600) / 60);
  const saniye = uptimeSaniye % 60;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({
      name: config.botName,
      iconURL: client.user.displayAvatarURL()
    })
    .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '📌 Sürüm', value: `\`${config.version}\``, inline: true },
      { name: '👨‍💻 Geliştirici', value: `\`${config.developer}\``, inline: true },
      { name: '⏱️ Uptime', value: `\`${saat}s ${dakika}d ${saniye}sn\``, inline: true },
      { name: '🏠 Sunucu Sayısı', value: `\`${client.guilds.cache.size}\``, inline: true },
      { name: '🎫 Toplam Ticket', value: `\`${ticketSayac - 1}\``, inline: true },
      { name: '📚 Discord.js', value: '`v14`', inline: true }
    )
    .setFooter({ text: `${config.botName} • ${config.version}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────
//  LOG GÖNDER
// ─────────────────────────────────────────────
async function logGonder(guild, { renk, baslik, alanlar }) {
  if (!config.logKanalId) return;
  const logKanal = guild.channels.cache.get(config.logKanalId);
  if (!logKanal) return;

  const embed = new EmbedBuilder()
    .setColor(renk)
    .setTitle(baslik)
    .addFields(alanlar)
    .setTimestamp()
    .setFooter({ text: config.botName });

  await logKanal.send({ embeds: [embed] }).catch(() => {});
}

// ─────────────────────────────────────────────
//  INTERACTION HANDLER
// ─────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  try {
    // Slash komutlar
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup')   await handleSetup(interaction);
      if (interaction.commandName === 'botinfo') await handleBotInfo(interaction);
      if (interaction.commandName === 'ticket') {
        // Manuel ticket açma
        const row = new ActionRowBuilder().addComponents(kategoriBildirgeciOlustur());
        await interaction.reply({
          content: '🎫 Bir kategori seçerek ticket oluşturabilirsiniz:',
          components: [row],
          ephemeral: true
        });
      }
    }

    // Select menu
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_kategori') await handleTicketOlustur(interaction);
    }

    // Butonlar
    if (interaction.isButton()) {
      if (interaction.customId === 'ticket_kapat') await handleKapat(interaction);
      if (interaction.customId === 'ticket_ustlen') await handleUstlen(interaction);
    }

  } catch (hata) {
    console.error('❌ Interaction Hatası:', hata);
    const mesaj = { content: '❌ Bir hata oluştu! Lütfen tekrar deneyin.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(mesaj).catch(() => {});
    } else {
      await interaction.reply(mesaj).catch(() => {});
    }
  }
});

// ─────────────────────────────────────────────
//  GİRİŞ
// ─────────────────────────────────────────────
client.login(config.token);
