#!/usr/bin/env ruby
# Fake IMAP server for testing
# Listens on port 3143 and responds to basic IMAP commands to prevent connection errors

require 'socket'
require 'logger'

class FakeImapServer
  attr_reader :logger

  def initialize(port = 3143, log_file = '/tmp/fake_imap_server.log')
    @port = port
    @server = nil
    @selected_mailbox = nil

    # Set up logger to write to file
    @logger = Logger.new(log_file)
    @logger.level = Logger::DEBUG
    @logger.formatter = proc do |severity, datetime, progname, msg|
      "[#{datetime.strftime('%Y-%m-%d %H:%M:%S.%L')}] #{severity}: #{msg}\n"
    end
  end

  def start
    @server = TCPServer.new('127.0.0.1', @port)
    logger.info "Server started on localhost:#{@port}"
    puts "[FAKE IMAP] Server started on localhost:#{@port} (logging to #{logger.instance_variable_get(:@logdev).filename})"

    Thread.new do
      loop do
        client = @server.accept
        logger.info "Client connected from #{client.peeraddr[2]}"
        handle_client(client)
      end
    rescue => e
      unless e.is_a?(IOError)
        logger.error "Server error: #{e.message}"
        logger.error e.backtrace.join("\n")
      end
    end
  end

  def stop
    @server&.close
    logger.info "Server stopped"
    puts "[FAKE IMAP] Server stopped"
  end

  private

  # Test email data
  TEST_EMAIL = <<~EMAIL
    From: es@es.es\r
    To: test@test.com\r
    Subject: This is a test email\r
    Date: Mon, 1 Jan 2024 12:00:00 +0000\r
    Message-ID: <test123@example.com>\r
    Content-Type: text/plain; charset=utf-8\r
    \r
    This is the body of the test email.
  EMAIL

  def handle_client(client)
    Thread.new do
      begin
        # Send initial greeting
        greeting = "* OK [CAPABILITY IMAP4rev1] Fake IMAP server ready"
        client.puts greeting
        logger.debug "SENT: #{greeting}"

        loop do
          line = client.gets
          break if line.nil?

          line = line.strip
          logger.debug "RECV: #{line}"

          # Parse command with flexible regex to capture arguments
          if line =~ /^(\w+)\s+(\w+)(.*)$/
            tag = $1
            command = $2.upcase
            args = $3.strip

            # Handle UID commands
            if command == 'UID'
              # Extract the actual command after UID
              if args =~ /^(\w+)\s*(.*)$/
                command = "UID_#{$1.upcase}"
                args = $2.strip
              end
            end

            case command
            when 'CAPABILITY'
              send_response(client, "* CAPABILITY IMAP4rev1")
              send_response(client, "#{tag} OK CAPABILITY completed")
            when 'LOGIN'
              send_response(client, "#{tag} OK LOGIN completed")
            when 'LOGOUT'
              send_response(client, "* BYE Logging out")
              send_response(client, "#{tag} OK LOGOUT completed")
              break
            when 'NOOP'
              send_response(client, "#{tag} OK NOOP completed")
            when 'LIST'
              # Return INBOX folder
              if args =~ /INBOX/i || args.empty?
                send_response(client, '* LIST (\\HasNoChildren) "/" "INBOX"')
              end
              send_response(client, "#{tag} OK #{command} completed")
            when 'LSUB'
              send_response(client, '* LSUB (\\HasNoChildren) "/" "INBOX"')
              send_response(client, "#{tag} OK #{command} completed")
            when 'SELECT', 'EXAMINE'
              @selected_mailbox = args.gsub('"', '')
              logger.info "Selected mailbox: #{@selected_mailbox}"
              # Report 1 message exists (our test email)
              send_response(client, "* 1 EXISTS")
              send_response(client, "* 0 RECENT")
              send_response(client, "* OK [UNSEEN 0] No unseen messages")
              send_response(client, "* OK [UIDVALIDITY 1] UIDs valid")
              send_response(client, "* OK [UIDNEXT 2] Predicted next UID")
              send_response(client, "* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)")
              send_response(client, "* OK [PERMANENTFLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft \\*)] Limited")
              send_response(client, "#{tag} OK [READ-WRITE] #{command} completed")
            when 'FETCH'
              # Handle FETCH command for our test email
              # Parse message number and what to fetch
              if args =~ /^(\d+(?::\d+|\*)?)\s+(.+)$/i
                msg_num = $1
                fetch_items = $2.upcase

                response_parts = []

                # Handle FLAGS
                if fetch_items.include?('FLAGS')
                  response_parts << 'FLAGS (\\Seen)'
                end

                # Handle UID
                if fetch_items.include?('UID')
                  response_parts << 'UID 1'
                end

                # Handle RFC822.SIZE
                if fetch_items.include?('RFC822.SIZE')
                  response_parts << "RFC822.SIZE #{TEST_EMAIL.bytesize}"
                end

                # Handle ENVELOPE
                if fetch_items.include?('ENVELOPE')
                  response_parts << 'ENVELOPE ("Mon, 1 Jan 2024 12:00:00 +0000" "This is a test email" ((NIL NIL "es" "es.es")) ((NIL NIL "es" "es.es")) ((NIL NIL "es" "es.es")) ((NIL NIL "test" "test.com")) NIL NIL NIL "<test123@example.com>")'
                end

                # Handle BODY.PEEK or BODY[]
                if fetch_items =~ /BODY\.PEEK\[HEADER\.FIELDS/i
                  # Return specific header fields
                  response_parts << 'BODY[HEADER.FIELDS (FROM TO SUBJECT)] {78}' + "\r\n" +
                                    'From: es@es.es' + "\r\n" +
                                    'To: test@test.com' + "\r\n" +
                                    'Subject: This is a test email' + "\r\n"
                elsif fetch_items.include?('BODY[]') || fetch_items.include?('RFC822')
                  # Return full message
                  escaped_email = TEST_EMAIL.gsub("\n", "\r\n")
                  response_parts << "BODY[] {#{escaped_email.bytesize}}\r\n#{escaped_email}"
                elsif fetch_items =~ /BODYSTRUCTURE/i
                  response_parts << 'BODYSTRUCTURE ("TEXT" "PLAIN" ("CHARSET" "utf-8") NIL NIL "7BIT" 35 1 NIL NIL NIL NIL)'
                end

                # Send combined response
                if response_parts.any?
                  send_response(client, "* 1 FETCH (#{response_parts.join(' ')})")
                end
              end
              send_response(client, "#{tag} OK FETCH completed")
            when 'UID_FETCH'
              # Handle UID FETCH - same as FETCH but with UID argument
              if args =~ /^(\d+(?::\d+|:\*)?)\s+(.+)$/i
                uid_range = $1
                fetch_items = $2.upcase

                # Parse UID range - for our simple case with 1 message (UID 1)
                # Handle ranges like "1", "1:1", "1:*"
                uids_to_fetch = []
                if uid_range =~ /^(\d+):(\d+|\*)$/
                  start_uid = $1.to_i
                  end_uid = $2 == '*' ? 1 : $2.to_i
                  uids_to_fetch = (start_uid..end_uid).to_a
                else
                  uids_to_fetch = [uid_range.to_i]
                end

                # Send response for each UID (in our case, just UID 1)
                uids_to_fetch.each do |uid|
                  next if uid < 1 || uid > 1  # We only have message UID 1

                  response_parts = []

                  # Always include UID in response
                  response_parts << "UID #{uid}"

                  # Handle FLAGS
                  if fetch_items.include?('FLAGS')
                    response_parts << 'FLAGS (\\Seen)'
                  end

                  # Handle RFC822.SIZE
                  if fetch_items.include?('RFC822.SIZE')
                    response_parts << "RFC822.SIZE #{TEST_EMAIL.bytesize}"
                  end

                  # Handle ENVELOPE
                  if fetch_items.include?('ENVELOPE')
                    response_parts << 'ENVELOPE ("Mon, 1 Jan 2024 12:00:00 +0000" "This is a test email" ((NIL NIL "es" "es.es")) ((NIL NIL "es" "es.es")) ((NIL NIL "es" "es.es")) ((NIL NIL "test" "test.com")) NIL NIL NIL "<test123@example.com>")'
                  end

                  # Handle BODY.PEEK or BODY[]
                  if fetch_items =~ /BODY\.PEEK\[HEADER\.FIELDS/i
                    response_parts << 'BODY[HEADER.FIELDS (FROM TO SUBJECT)] {78}' + "\r\n" +
                                      'From: es@es.es' + "\r\n" +
                                      'To: test@test.com' + "\r\n" +
                                      'Subject: This is a test email' + "\r\n"
                  elsif fetch_items.include?('BODY[]') || fetch_items.include?('RFC822')
                    escaped_email = TEST_EMAIL.gsub("\n", "\r\n")
                    response_parts << "BODY[] {#{escaped_email.bytesize}}\r\n#{escaped_email}"
                  elsif fetch_items =~ /BODYSTRUCTURE/i
                    response_parts << 'BODYSTRUCTURE ("TEXT" "PLAIN" ("CHARSET" "utf-8") NIL NIL "7BIT" 35 1 NIL NIL NIL NIL)'
                  end

                  if response_parts.any?
                    send_response(client, "* 1 FETCH (#{response_parts.join(' ')})")
                  end
                end
              end
              send_response(client, "#{tag} OK UID FETCH completed")
            when 'SEARCH'
              # Return message 1 for any search
              send_response(client, "* SEARCH 1")
              send_response(client, "#{tag} OK SEARCH completed")
            when 'UID_SEARCH'
              # Return UID 1 for any UID search
              send_response(client, "* SEARCH 1")
              send_response(client, "#{tag} OK UID SEARCH completed")
            when 'STATUS'
              # Return status for mailbox
              send_response(client, "* STATUS INBOX (MESSAGES 1 RECENT 0 UNSEEN 0)")
              send_response(client, "#{tag} OK STATUS completed")
            else
              # Generic OK response for any other command
              logger.warn "Unknown command: #{command}"
              send_response(client, "#{tag} OK #{command} completed")
            end
          end
        end
      rescue => e
        logger.error "Client error: #{e.message}"
        logger.error e.backtrace.first(10).join("\n")
      ensure
        logger.info "Client disconnected"
        client.close rescue nil
      end
    end
  end

  def send_response(client, message)
    client.puts message
    logger.debug "SENT: #{message}"
  end
end

# Run the server if executed directly
if __FILE__ == $0
  server = FakeImapServer.new(3143)
  server.start

  # Keep the main thread alive
  trap('INT') do
    puts "\n[FAKE IMAP] Shutting down..."
    server.stop
    exit
  end

  puts "[FAKE IMAP] Press Ctrl+C to stop"
  sleep
end
